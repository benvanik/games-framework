# Copyright 2012 Google Inc. All Rights Reserved.

"""Rule dependency graph.

A rule graph represents all of the rules in a project as they have been resolved
and tracked for dependencies. The graph can then be queried for various
information such as build rule sets/etc.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import itertools
import networkx as nx

import build
import project
import util


class RuleGraph(object):
  """A graph of rule nodes.
  """

  def __init__(self, project):
    """Initializes a rule graph.

    Args:
      project: Project to use for resolution.
    """
    self.project = project

    # A map of rule names to nodes, if they exist
    self.rule_nodes = {}

    # Build the graph - may throw errors if the graph is invalid
    self.graph = self._construct_graph()

    # Stash a reversed graph for faster sequencing
    self._reverse_graph = self.graph.reverse()

  def _construct_graph(self):
    """Constructs a graph representing all rules in the project.
    If any errors are encountered in the graph construction, such as missing
    rules or cycles, exceptions will be raised.

    Returns:
      A directed graph containing all rules.

    Raises:
      KeyError: A rule was not found or was present multiple times.
      ValueError: The graph cannot be constructed due to a cycle.
    """
    graph = nx.DiGraph()

    # Add all rules
    for rule in self.project.rules_iter():
      rule_node = _RuleNode(rule)
      if self.rule_nodes.has_key(rule.full_name):
        raise KeyError('Rule "%s" present multiple times' % (rule.full_name))
      self.rule_nodes[rule.full_name] = rule_node
      graph.add_node(rule_node)

    # Add edges for each rule
    for rule in self.project.rules_iter():
      rule_node = self.rule_nodes[rule.full_name]
      for dep in itertools.chain(rule.srcs, rule.deps):
        if util.is_rule_name(dep):
          dep_node = self.rule_nodes.get(dep, None)
          if not dep_node:
            raise KeyError('Rule "%s" (required by "%s") not found' % (
                dep, rule.full_name))
          graph.add_edge(dep_node, rule_node)

    # Ensure the graph is a DAG (no cycles)
    if not nx.is_directed_acyclic_graph(graph):
      # TODO(benvanik): use nx.simple_cycles() to print the cycles
      raise ValueError('Cycle detected in the rule graph')

    return graph

  def has_dependency(self, rule_name, predecessor_rule_name):
    """Checks to see if the given rule has a dependency on another rule.

    Args:
      rule_name: The name of the rule to check.
      predecessor_rule_name: A potential predecessor rule.

    Returns:
      True if by any way rule_name depends on predecessor_rule_name.

    Raises:
      KeyError: One of the given rules was not found.
    """
    rule_node = self.rule_nodes.get(rule_name, None)
    if not rule_node:
      raise KeyError('Rule "%s" not found' % (rule_name))
    predecessor_rule_node = self.rule_nodes.get(predecessor_rule_name, None)
    if not predecessor_rule_node:
      raise KeyError('Rule "%s" not found' % (predecessor_rule_name))
    return nx.has_path(self.graph, predecessor_rule_node, rule_node)

  def calculate_rule_sequence(self, target_rule_names):
    """Calculates an ordered sequence of rules terminating with the given
    target rules.

    By passing multiple target names it's possible to build a combined sequence
    that ensures all the given targets are included with no duplicate
    dependencies.

    Args:
      target_rule_names: A list of target rule names to include in the
          sequence.

    Returns:
      An ordered list of Rule instances including all of the given target rules
      and their dependencies.

    Raises:
      KeyError: One of the given rules was not found.
    """
    sequence_graph = nx.DiGraph()

    # Add all paths for targets
    # Paths are added in reverse (from target to dependencies)
    for rule_name in target_rule_names:
      rule_node = self.rule_nodes.get(rule_name, None)
      if not rule_node:
        raise KeyError('Target rule "%s" not found' % (rule_name))
      path = list(nx.topological_sort(self._reverse_graph, [rule_node]))
      if len(path) == 1:
        sequence_graph.add_node(path[0])
      else:
        sequence_graph.add_path(path)

    # Reverse the graph so that it's dependencies -> targets
    reversed_sequence_graph = sequence_graph.reverse()

    # Get the list of nodes in sorted order
    rule_sequence = []
    for rule_node in nx.topological_sort(reversed_sequence_graph):
      rule_sequence.append(rule_node.rule)
    return rule_sequence


class _RuleNode(object):
  """A node type that references a rule in the project."""

  def __init__(self, rule):
    """Initializes a rule node.

    Args:
      rule: The rule this node describes.
    """
    self.rule = rule

  def __repr__(self):
    return self.rule.full_name
