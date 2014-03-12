from google.appengine.ext import webapp
from controllers import *

app = webapp.WSGIApplication([
    ('/', HomeController),
    ('/sheet/([^/]*)(/[^/]*)?', SheetController),
    ('/api/sheet', SheetApi),
    ('/api/item', LineItemApi),
    ('/api/request', PaymentRequestApi),
    ('/stats', StatsController),
], debug=True)
