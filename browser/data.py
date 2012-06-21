# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'

from google.appengine.ext import db


class ServerRegistration(db.Model):
  email = db.EmailProperty(required=True)
  uuid = db.StringProperty(required=True)
  private_key = db.StringProperty(required=True)


class ServerEntry(db.Model):
  uuid = db.StringProperty(required=True)
  endpoint = db.StringProperty()
  update_time = db.DateTimeProperty()
  server_name = db.StringProperty()
  server_location = db.StringProperty()
  game_type = db.StringProperty()
  game_version = db.StringProperty()
  game_properties = db.ListProperty(unicode)
  user_max = db.IntegerProperty()
  user_count = db.IntegerProperty()
  users = db.ListProperty(unicode)
