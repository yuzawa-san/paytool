from google.appengine.ext import ndb
import time

class Sheet(ndb.Model):
    name = ndb.StringProperty(default='Untitled Sheet')
    owner = ndb.UserProperty(indexed=True)
    private = ndb.BooleanProperty(default=True)
    acceptsRequests = ndb.BooleanProperty(default=False)
    
    def apiDict(self):
        return {
            'id': self.key.urlsafe(),
            'name': self.name,
            'private': self.private,
            'acceptsRequests': self.acceptsRequests,
            'owner': {
                'user_id': self.owner.user_id(),
                'nickname': self.owner.nickname(),
                'email': self.owner.email(),
            }
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
        
        
class PaymentRequest(ndb.Model):
    fromPerson = ndb.StringProperty(default='Nobody')
    toPerson = ndb.StringProperty(default='Nobody')
    value = ndb.FloatProperty(default=0.0)
    description = ndb.StringProperty(default='')
    owner = ndb.UserProperty()
    createdDate = ndb.DateTimeProperty(auto_now_add=True)

    def apiDict(self):
        return {
            'id': self.key.urlsafe(),
            'from': self.fromPerson,
            'to': self.toPerson,
            'value': self.value,
            'description': self.description,
            'createdDate': int(time.mktime(self.createdDate.timetuple()) * 1000),
            'owner': {
                'user_id': self.owner.user_id(),
                'nickname': self.owner.nickname(),
                'email': self.owner.email(),
            }
        }


class WatchlistItem(ndb.Model):
    sheet = ndb.KeyProperty(indexed=True)
    owner = ndb.UserProperty(indexed=True)

    def apiDict(self):
        return {
            'id': self.key.urlsafe(),
            'sheet': self.sheet.get().apiDict()
        }