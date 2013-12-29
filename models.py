from google.appengine.ext import ndb

class Sheet(ndb.Model):
    name = ndb.StringProperty(default='Untitled Sheet')
    owner = ndb.UserProperty(indexed=True)
    private = ndb.BooleanProperty(default=True)
    
    def apiDict(self):
        return {
            'id': self.key.urlsafe(),
            'name': self.name,
            'private': self.private,
        }
    
class LineItem(ndb.Model):
    fromPerson = ndb.StringProperty(default='Nobody')
    toPerson = ndb.StringProperty(default='Nobody')
    value = ndb.FloatProperty(default=0.0)
    description = ndb.StringProperty(default='')
    createdDate = ndb.DateTimeProperty(auto_now_add=True)
    
    def apiDict(self):
        return {
            'id': self.key.urlsafe(),
            'from': self.fromPerson,
            'to': self.toPerson,
            'value': self.value,
            'description': self.description,
        }