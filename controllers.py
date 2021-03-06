from google.appengine.api import memcache
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import ndb
from google.appengine.ext.ndb import Key
from google.appengine.ext.webapp import template
from models import *
import logging
import json
import hashlib
from datetime import date, datetime

def gravatar_hash(email):
    data = memcache.get(email, namespace='gravatar')
    if data is not None:
        return data
    else:
        email = email.strip().lower()
        data = hashlib.md5(email).hexdigest()
        memcache.add(email, data, time=604800, namespace='gravatar') # keep for a week
        return data

class HomeController(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        avatar = None
        if user:
            url = users.create_logout_url(self.request.uri)
            avatar = gravatar_hash(user.email())
        else:
            url = users.create_login_url(self.request.uri)
            
        values = {
            'gravatar': avatar,
            'user': user,
            'auth_url': url,
        }
        self.response.out.write(template.render('index.html', values))
        
class StatsController(webapp.RequestHandler):
    def get(self):
        if not users.is_current_user_admin():
            self.redirect('/')
            return
        user = users.get_current_user()
        
        values = {
            'users': Sheet.query(group_by=[Sheet.owner], projection=[Sheet.owner]).count(),
            'sheets': Sheet.query().count(),
            'lineItems': LineItem.query().count(),
            'paymentRequests': PaymentRequest.query().count(),
        }
        
        self.response.headers["Content-Type"] = "text/plain"
        self.response.out.write(template.render('stats.txt', values))

class SheetController(webapp.RequestHandler):
    def get(self, *args):
        if not args[0]:
            self.redirect('/')
            return
        key = args[0]
        sheet = Key(urlsafe=key).get()
        if not (isinstance(sheet, Sheet) or sheet):
            self.redirect('/')
            return
        user = users.get_current_user()
        if sheet.private and sheet.owner != user and args[1] != '/submit':
            self.redirect('/')
            return
        
        user = users.get_current_user()
        if user:
            url = users.create_logout_url(self.request.uri)
        else:
            url = users.create_login_url(self.request.uri)
        
        avatar = gravatar_hash(sheet.owner.email())
        
        values = {
            'gravatar': avatar,
            'sheet': sheet,
            'user': user,
            'auth_url': url,
        }
        
        if args[1] == '/print':
            self.response.out.write(template.render('print.html', values))
        elif args[1] == '/submit':
            if user == sheet.owner:
                self.redirect('/sheet/'+sheet.key.urlsafe())
            if user and sheet.acceptsRequests:
                self.response.out.write(template.render('submit.html', values))
            elif sheet.acceptsRequests:
                self.redirect(url)
            else:
                self.redirect('/')
        elif user != sheet.owner:
            self.response.out.write(template.render('display.html', values))
        else:
            self.response.out.write(template.render('sheet.html', values))

class SheetApi(webapp.RequestHandler):
    def pregame(self, auth=False, instance=False, ownership=False):
        sheet = None
        user = users.get_current_user()
        if auth and (not user):
            raise Exception(401, "Login Required")
        if instance:
            key = self.request.get('id')
            if not key:
                raise Exception(400, "Sheet ID Required")
            try:
                sheet = Key(urlsafe=key).get()
            except:
                raise Exception(404, "Sheet Not Found")
            if not isinstance(sheet, Sheet):
                raise Exception(404, "Sheet Not Found")
            if ownership and sheet.owner != user:
                raise Exception(403, "Sheet Access Forbidden")
        self.response.headers["Content-Type"] = "application/json"
        return sheet

    def handle_exception(self, exception, debug_mode):
        if isinstance(exception.args[0], int):
            self.response.headers["Content-Type"] = "application/json"
            payload = {
                'error':exception.args[1]
            }
            self.response.out.write(json.dumps(payload))
        else:
            super(SheetApi, self).handle_exception(exception, debug_mode)

    def get(self):
        key = self.request.get('id')
        if key:
            sheet = self.pregame(instance=True)
            payload = sheet.apiDict()
        else:
            self.pregame(auth=True)
            sheets = Sheet.gql("WHERE owner = :owner", owner=users.get_current_user()).order(Sheet.name)
            payload = [sheet.apiDict() for sheet in sheets]
        self.response.out.write(json.dumps(payload))

    def post(self):
        user = users.get_current_user()
        self.pregame(auth=True)
        name = self.request.get('name') or "Untitled Sheet %s" % datetime.now()
        private = (self.request.get('private') == '1')
        acceptsRequests = (self.request.get('acceptsRequests') == '1')
        sheet = Sheet(owner=user, name=name, private=private, acceptsRequests=acceptsRequests)
        key = sheet.put();
        payload = sheet.apiDict()
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(json.dumps(payload))

    def put(self):
        user = users.get_current_user()
        sheet = self.pregame(auth=True, instance=True, ownership=True)
        
        name = self.request.get('name')
        private = self.request.get('private')
        acceptsRequests = self.request.get('acceptsRequests')
        
        if name:
            sheet.name = name
        if private:
            sheet.private = (private == '1')
        if acceptsRequests:
            sheet.acceptsRequests = (acceptsRequests == '1')
        key = sheet.put();
        payload = sheet.apiDict()
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(json.dumps(payload))

    def delete(self):
        user = users.get_current_user()
        sheet = self.pregame(auth=True, instance=True, ownership=True)
        if self.request.get('purge'):
            items = LineItem.query(ancestor=sheet.key).order(LineItem.createdDate)
            for item in items:
                item.key.delete()
        else:
            sheet.key.delete()
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(json.dumps(True))

class LineItemApi(webapp.RequestHandler):
    def handle_exception(self, exception, debug_mode):
        if isinstance(exception.args[0], int):
            self.response.headers["Content-Type"] = "application/json"
            payload = {
                'error':exception.args[1]
            }
            self.response.out.write(json.dumps(payload))
        else:
            super(LineItemApi, self).handle_exception(exception, debug_mode)

    def pregame(self, hasInstance=False, login=True, ownership=False):
        user = users.get_current_user()
        if login and not user:
            raise Exception(401, "Login Required")
        key = self.request.get('sheet_id')
        if not key:
            raise Exception(400, "Sheet ID Required")
        try:
            sheet = Key(urlsafe=key).get()
        except:
            raise Exception(404, "Sheet Not Found")
        if not isinstance(sheet, Sheet):
            raise Exception(404, "Sheet Not Found")
        if (ownership or sheet.private) and sheet.owner != user:
            raise Exception(403, "Sheet Access Forbidden")
        instance = None
        if hasInstance:
            key = self.request.get('id')
            if not key:
                raise Exception(400, "Line Item ID Required")
            try:
                instance = Key(urlsafe=key).get()
            except:
                raise Exception(404, "Line Item Not Found")
            if not isinstance(instance, LineItem):
                raise Exception(404, "Line Item Not Found")
            #if instance.parent != sheet:
        self.response.headers["Content-Type"] = "application/json"
        return (sheet, instance)

    def get(self):
        (sheet, _) = self.pregame(login=False)
        items = LineItem.query(ancestor=sheet.key).order(LineItem.createdDate)
        payload = [item.apiDict() for item in items]
        self.response.out.write(json.dumps(payload))

    def post(self):
        (sheet, _) = self.pregame(ownership=True)
        toPerson = self.request.get('to') or "Unknown"
        fromPerson = self.request.get('from') or "Unknown"
        description = self.request.get('description') or ""
        value = self.request.get('value') or 0.0
        if value < 0:
            raise Exception(400, "Value must be non-negative.")
        item = LineItem(parent=sheet.key, toPerson=toPerson, fromPerson=fromPerson, description=description, value=float(value))
        item.put()
        payload = item.apiDict()
        self.response.out.write(json.dumps(payload))

    def put(self):
        (sheet, item) = self.pregame(ownership=True, hasInstance=True)
        toPerson = self.request.get('to')
        fromPerson = self.request.get('from')
        description = self.request.get('description')
        value = self.request.get('value')
        if value:
            item.value = float(value)
            if value < 0:
                raise Exception(400, "Value must be non-negative.")
        if toPerson:
            item.toPerson = toPerson
        if fromPerson:
            item.fromPerson = fromPerson
        if description:
            item.description = description
        item.put()
        payload = item.apiDict()
        self.response.out.write(json.dumps(payload))

    def delete(self):
        (_, item) = self.pregame(ownership=True, hasInstance=True)
        item.key.delete()
        self.response.out.write(json.dumps(True))


class PaymentRequestApi(webapp.RequestHandler):
    def handle_exception(self, exception, debug_mode):
        if isinstance(exception.args[0], int):
            self.response.headers["Content-Type"] = "application/json"
            payload = {
                'error':exception.args[1]
            }
            self.response.out.write(json.dumps(payload))
        else:
            super(PaymentRequestApi, self).handle_exception(exception, debug_mode)

    def pregame(self, hasInstance=False, login=True):
        user = users.get_current_user()
        if login and not user:
            raise Exception(401, "Login Required")
        key = self.request.get('sheet_id')
        if not key:
            raise Exception(400, "Sheet ID Required")
        try:
            sheet = Key(urlsafe=key).get()
        except:
            raise Exception(404, "Sheet Not Found")
        if not isinstance(sheet, Sheet):
            raise Exception(404, "Sheet Not Found")
        instance = None
        if hasInstance:
            key = self.request.get('id')
            if not key:
                raise Exception(400, "Payment Request ID Required")
            try:
                instance = Key(urlsafe=key).get()
            except:
                raise Exception(404, "Payment Request Not Found")
            if not isinstance(instance, PaymentRequest):
                raise Exception(404, "Payment Request Not Found")
            #if instance.parent != sheet:
        self.response.headers["Content-Type"] = "application/json"
        return (sheet, instance)

    def get(self):
        user = users.get_current_user()
        (sheet, _) = self.pregame()
        if sheet.owner == user:
            items = PaymentRequest.query(ancestor=sheet.key).order(PaymentRequest.createdDate)
        else:
            items = PaymentRequest.query(PaymentRequest.owner==user, ancestor=sheet.key).order(PaymentRequest.createdDate)
        payload = [item.apiDict() for item in items]
        self.response.out.write(json.dumps(payload))

    def post(self):
        (sheet, _) = self.pregame(login=True)
        toPerson = self.request.get('to') or "Unknown"
        fromPerson = self.request.get('from') or "Unknown"
        description = self.request.get('description') or ""
        value = self.request.get('value') or 0.0
        if value < 0:
            raise Exception(400, "Value must be non-negative.")
        item = PaymentRequest(parent=sheet.key, toPerson=toPerson, fromPerson=fromPerson, description=description, value=float(value), owner=users.get_current_user())
        item.put()
        payload = item.apiDict()
        self.response.out.write(json.dumps(payload))

    def put(self):
        user = users.get_current_user()
        (sheet, item) = self.pregame(hasInstance=True)
        if item.owner != user:
            raise Exception(400, "Operation is forbidden. You must own payment request to edit it.")
        toPerson = self.request.get('to')
        fromPerson = self.request.get('from')
        description = self.request.get('description')
        value = self.request.get('value')
        if value:
            item.value = float(value)
            if value < 0:
                raise Exception(400, "Value must be non-negative.")
        if toPerson:
            item.toPerson = toPerson
        if fromPerson:
            item.fromPerson = fromPerson
        if description:
            item.description = description
        item.put()
        payload = item.apiDict()
        self.response.out.write(json.dumps(payload))
    

    def delete(self):
        user = users.get_current_user()
        (sheet, item) = self.pregame(hasInstance=True)
        if sheet.owner != user and item.owner != user:
            raise Exception(400, "Operation is forbidden. You must own sheet or payment request to delete it.")
        item.key.delete()
        self.response.out.write(json.dumps(True))


class WatchlistApi(webapp.RequestHandler):
    def handle_exception(self, exception, debug_mode):
        if isinstance(exception.args[0], int):
            self.response.headers["Content-Type"] = "application/json"
            payload = {
                'error':exception.args[1]
            }
            self.response.out.write(json.dumps(payload))
        else:
            super(WatchlistApi, self).handle_exception(exception, debug_mode)

    def pregame(self, hasInstance=False):
        user = users.get_current_user()
        if not user:
            raise Exception(401, "Login Required")
        instance = None
        if hasInstance:
            key = self.request.get('id')
            if not key:
                raise Exception(400, "Watch List Item ID Required")
            try:
                instance = Key(urlsafe=key).get()
            except:
                raise Exception(404, "Watch List Item Not Found")
            if not isinstance(instance, WatchlistItem):
                raise Exception(404, "Watch List Item Not Found")
            #if instance.parent != sheet:
        self.response.headers["Content-Type"] = "application/json"
        return instance

    def get(self):
        self.pregame()
        user = users.get_current_user()
        key = self.request.get('sheet_id')
        if key:
            try:
                sheet = Key(urlsafe=key)
            except:
                raise Exception(404, "Sheet Not Found")
            item = WatchlistItem.gql("WHERE owner = :owner AND sheet = :sheet", owner=user, sheet=sheet).get()
            if item:
                payload = item.key.urlsafe()
            else:
                payload = False
        else:
            items = WatchlistItem.gql("WHERE owner = :owner", owner=user)
            payload = [item.apiDict() for item in items]
        self.response.out.write(json.dumps(payload))

    def post(self):
        self.pregame()
        user = users.get_current_user()
        key = self.request.get('sheet_id')
        if not key:
            raise Exception(400, "Sheet ID Required")
        try:
            sheet = Key(urlsafe=key).get()
        except:
            raise Exception(404, "Sheet Not Found")
        if not isinstance(sheet, Sheet):
            raise Exception(404, "Sheet Not Found")
        
        item = WatchlistItem.gql("WHERE owner = :owner AND sheet = :sheet", owner=user, sheet=sheet.key).get()
        if item:
            payload = item.apiDict()
        else:
            item = WatchlistItem(sheet=sheet.key, owner=user)
            item.put()
            payload = item.apiDict()
        self.response.out.write(json.dumps(payload))

    def delete(self):
        user = users.get_current_user()
        item = self.pregame(hasInstance=True)
        if item.owner != user:
            raise Exception(400, "Operation is forbidden. You must own a watchlist item to delete it.")
        item.key.delete()
        self.response.out.write(json.dumps(True))
