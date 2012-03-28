# Copyright 2012 Google Inc. All Rights Reserved.

"""Rule dependency graph.

A rule graph represents all of the rules in a project as they have been resolved
and tracked for dependencies. The graph can then be queried for various
information such as build rule sets/etc.
"""

"""
Basic flow notes:
# build graph
g = nx.DiGraph()
g.add_node('x')
g.add_edge('x', 'y')
# reverse
r = g.reverse()
# create run graph
g1 = nx.DiGraph()
for target in targets:
  g1.add_path(nx.topological_sort(r, target))
# reverse
g2 = g1.reverse()
# get the list of nodes in sorted order
run_list = list(nx.topological_sort(g2))
# run the list in order
# parallel:
#   keep a list of in progress nodes
#   on new worker free:
#     peek next item i
#     for each node in progress p:
#       if not nx.has_path(g, p, i):
#         queue
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
      rule_node = RuleNode(rule)
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

  def calculate_rule_sequence(self, target_rule_names=None):
    """
    """
    # TODO(benvanik): sequence
    # create run graph
    # g1 = nx.DiGraph()
    # for target in targets:
    #   g1.add_path(nx.topological_sort(self._reverse_graph, target))
    # reverse
    # g2 = g1.reverse()
    # get the list of nodes in sorted order
    # run_list = list(nx.topological_sort(g2))


class GraphNode(object):
  """Base node type for the rule graph.
  """

  def __init__(self, *args, **kwargs):
    """Initializes a node.
    """
    super(GraphNode, self).__init__()


class RuleNode(GraphNode):
  """A node type that references a rule in the project.
  """

  def __init__(self, rule, *args, **kwargs):
    """Initializes a rule node.

    Args:
      rule: The rule this node describes.
    """
    super(RuleNode, self).__init__(*args, **kwargs)
    self.rule = rule

  def __repr__(self):
    return ':' + self.rule.name
