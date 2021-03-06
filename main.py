from google.appengine.ext import webapp
from controllers import *

app = webapp.WSGIApplication([
    ('/', HomeController),
    ('/sheet/([^/]*)(/[^/]*)?', SheetController),
    ('/api/sheet', SheetApi),
    ('/api/item', LineItemApi),
    ('/api/request', PaymentRequestApi),
    ('/api/watchlist', WatchlistApi),
    ('/stats', StatsController),
], debug=True)
