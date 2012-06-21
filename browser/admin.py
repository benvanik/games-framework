# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'

import cgi
import jinja2
import os
import uuid
import webapp2
from google.appengine.ext import db
from google.appengine.api import users

from data import *


jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class AdminPage(webapp2.RequestHandler):
  def get(self):
    user = users.get_current_user()
    if not user or not users.is_current_user_admin():
      self.redirect(users.create_login_url(self.request.uri))
      return
    self.response.headers['Content-Type'] = 'text/html'

    # Grab data
    server_registrations = ServerRegistration.gql('ORDER BY email ASC')
    server_entries = ServerEntry.gql('ORDER BY server_name ASC')

    template_values = {
        'user': user,
        'server_registrations': server_registrations,
        'server_entries': server_entries,
        }

    template = jinja_environment.get_template('admin.html')
    self.response.out.write(template.render(template_values))


class CreateKeyMethod(webapp2.RequestHandler):
  def post(self):
    if not users.is_current_user_admin():
      self.redirect(users.create_login_url(self.request.uri))
      return
    self.response.headers['Content-Type'] = 'text/html'

    # TODO(benvanik): validate email
    email = self.request.get('email')

    # Find server with email - if present, return that
    existing_server = ServerRegistration.gql('WHERE email=:1', email).get()
    if existing_server:
      self.response.out.write(
          'Server already exists: %s' % (existing_server.uuid))
      return

    server_registration = ServerRegistration(email=db.Email(email),
                                             uuid=str(uuid.uuid4()),
                                             private_key=str(uuid.uuid4()))
    server_registration.put()

    self.response.out.write('<br/>'.join([
        'Server registered:',
        'UUID: %s' % (cgi.escape(server_registration.uuid)),
        'E-mail: %s' % (cgi.escape(server_registration.email)),
        'Private Key: %s' % (cgi.escape(server_registration.private_key)),
        ]))

    self.response.out.write('<br/><a href="/admin/"><< Back</a>')


class DeleteKeyMethod(webapp2.RequestHandler):
  def get(self, uuid):
    if not users.is_current_user_admin():
      self.redirect(users.create_login_url(self.request.uri))
      return
    self.response.headers['Content-Type'] = 'text/html'

    existing_server = ServerRegistration.gql('WHERE uuid=:1', uuid).get()
    if not existing_server:
      self.response.out.write('Registration not found: %s' % (uuid))
      return

    existing_server.delete()

    self.response.out.write('Registration deleted: %s' % (existing_server.uuid))
    self.response.out.write('<br/><a href="/admin/"><< Back</a>')


app = webapp2.WSGIApplication([
    ('/admin/', AdminPage),
    ('/admin/key/create', CreateKeyMethod),
    webapp2.Route('/admin/key/<uuid>/delete', DeleteKeyMethod),
    ], debug=True)
