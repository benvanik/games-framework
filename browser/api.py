# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'

import cgi
import datetime
import json
import logging
import webapp2
from google.appengine.ext import db

from data import *


class ServerMethod(webapp2.RequestHandler):
  def check_server_registration_(self, server_uuid):
    """Super basic server auth.
    This method will attempt to match the headers with a known server
    registration. If none is found or an error occurs then a response will be
    sent and the caller should return immediately.

    Args:
      server_uuid: The server UUID that the method is trying to modify.

    Returns:
      The ServerRegistration for the server or None if it was not found.
    """
    # Pull out request headers
    uuid = self.request.headers.get('X-GF-Server-ID', None)
    private_key = self.request.headers.get('X-GF-Server-Key', None)
    if not uuid or not len(uuid) or not private_key or not len(private_key):
      logging.error('server %s request headers not found' % (server_uuid))
      self.response.status_int = 400
      self.response.out.write('{}')
      return None

    # Verify request is for the right server
    if server_uuid != uuid:
      logging.error('server %s registration mismatch' % (server_uuid))
      self.response.status_int = 401
      self.response.out.write('{}')
      return None

    # Attempt to find the registration
    server_registration = ServerRegistration.gql(
        'WHERE uuid=:1 AND private_key=:2', uuid, private_key).get()

    # If not found, deny
    if not server_registration:
      logging.error('server %s registration not found' % (server_uuid))
      self.response.status_int = 401
      self.response.out.write('{}')
      return None

    return server_registration

  def put(self, server_uuid):
    logging.info('registering server %s' % (server_uuid))

    self.response.headers['Content-Type'] = 'text/plain'
    server_registration = self.check_server_registration_(server_uuid)
    if not server_registration:
      return

    # Try to find an existing entry
    server_entry = ServerEntry.gql('WHERE uuid=:1', server_uuid).get()
    if not server_entry:
      server_entry = ServerEntry(uuid=server_uuid)

    # Parse JSON
    content = json.loads(self.request.body)

    # Guess server endpoint
    endpoint = 'ws://%s:%s' % (self.request.remote_addr,
                               int(content['endpoint']))

    # Populate and put
    server_entry.endpoint = endpoint
    server_entry.update_time = datetime.datetime.utcnow()
    server_entry.server_name = cgi.escape(content['server_name'])
    server_entry.server_location = cgi.escape(content['server_location'])
    server_entry.game_type = cgi.escape(content['game_type'])
    server_entry.game_version = cgi.escape(content['game_version'])
    server_entry.game_properties = list(content['game_properties'])
    server_entry.user_max = int(content['user_max'])
    server_entry.user_count = 0
    server_entry.users = []
    server_entry.put()

    self.response.out.write('{}')

  def delete(self, server_uuid):
    logging.info('unregistering server %s' % (server_uuid))

    self.response.headers['Content-Type'] = 'text/plain'
    server_registration = self.check_server_registration_(server_uuid)
    if not server_registration:
      return

    # Try to find an existing entry
    server_entry = ServerEntry.gql('WHERE uuid=:1', server_uuid).get()
    if not server_entry:
      self.response.status_int = 404
      self.response.out.write('{}')
      return

    server_entry.delete()

    self.response.out.write('{}')

  def post(self, server_uuid):
    logging.info('updating server %s' % (server_uuid))

    self.response.headers['Content-Type'] = 'text/plain'
    server_registration = self.check_server_registration_(server_uuid)
    if not server_registration:
      return

    # Try to find an existing entry
    server_entry = ServerEntry.gql('WHERE uuid=:1', server_uuid).get()
    if not server_entry:
      self.response.status_int = 404
      self.response.out.write('{}')
      return

    # Parse JSON
    content = json.loads(self.request.body)

    # Update the entry
    server_entry.update_time = datetime.datetime.utcnow()
    server_entry.user_count = int(content['user_count'])
    # TODO(benvanik): store users
    server_entry.users = []
    server_entry.put()

    self.response.out.write('{}')


class QueryMethod(webapp2.RequestHandler):
  def get(self, game_type, game_version):
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.headers['Access-Control-Allow-Origin'] = '*'

    json_entries = []
    latest_time = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)
    for server_entry in ServerEntry.gql(
        'WHERE game_type=:1 AND game_version=:2 AND update_time>:3',
        game_type, game_version, latest_time):
      json_entries.append({
          'server_info': {
            'endpoint': server_entry.endpoint,
            'server_name': server_entry.server_name,
            'server_location': server_entry.server_location,
            'game_type': server_entry.game_type,
            'game_version': server_entry.game_version,
            'game_properties': server_entry.game_properties,
            'user_max': server_entry.user_max,
            'user_count': server_entry.user_count,
          }
          })

    self.response.out.write(json.dumps(json_entries))


app = webapp2.WSGIApplication([
    webapp2.Route('/api/server/<server_uuid>', ServerMethod),
    webapp2.Route('/api/query/<game_type>/<game_version>', QueryMethod),
    ], debug=True)
