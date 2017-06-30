const express = require( 'express' ),
  app = express(),
  bodyParser = require( 'body-parser' ),
  nunjucks = require( 'nunjucks' ),
  nunjucksDate = require( 'nunjucks-date' ),
  MongoClient = require( 'mongodb' ).MongoClient,
  assert = require( 'assert' ),
  ItemDao = require( './items' ).ItemDao,
  CartDao = require( './cart' ).CartDao;

// application setup

app.set( 'view engine', 'html' );
app.set( 'views', __dirname + '/views' );
app.use( '/static', express.static( __dirname + '/static' ) )
app.use( bodyParser.urlencoded( {
  extended: true
} ) );

const env = nunjucks.configure( 'views', {
  autoescape: true,
  express: app
} );

nunjucksDate.setDefaultFormat( 'MMMM Do YYYY, h:mm:ss a' );
env.addFilter( "date", nunjucksDate )

// application constants

const ITEMS_PER_PAGE = 5;
const USERID = "558098a65133816958968d88";

// application

MongoClient.connect( 'mongodb://localhost:27017/mongomart', function( err, db ) {
  "use strict";

  assert.equal( null, err );
  console.log( "Successfully connected to MongoDB." );

  const itemDao = new ItemDao( db );
  const cartDao = new CartDao( db );

  const router = express.Router();

  // homepage

  router.get( '/', function( req, res ) {
    "use strict";

    const page = req.query.page ? parseInt( req.query.page ) : 0;
    const category = req.query.category ? req.query.category : "All";

    itemDao.getCategories( function( categories ) {

      itemDao.getItems( category, page, ITEMS_PER_PAGE, function( pageItems ) {

        itemDao.getNumItems( category, function( itemCount ) {

          let numPages = 0;
          if ( itemCount > ITEMS_PER_PAGE ) {
            numPages = Math.ceil( itemCount / ITEMS_PER_PAGE );
          }

          res.render( 'home', {
            category_param: category,
            categories: categories,
            useRangeBasedPagination: false,
            itemCount: itemCount,
            pages: numPages,
            page: page,
            items: pageItems
          } );
        } );
      } );
    } );
  } );

  // search

  router.get( '/search', function( req, res ) {
    "use strict";

    const page = req.query.page ? parseInt( req.query.page ) : 0;
    const query = req.query.query ? req.query.query : "";

    itemDao.searchItems( query, page, ITEMS_PER_PAGE, function( searchItems ) {

      itemDao.getNumSearchItems( query, function( itemCount ) {

        let numPages = 0;
        if ( itemCount > ITEMS_PER_PAGE ) {
          numPages = Math.ceil( itemCount / ITEMS_PER_PAGE );
        }

        res.render( 'search', {
          queryString: query,
          itemCount: itemCount,
          pages: numPages,
          page: page,
          items: searchItems
        } );
      } );
    } );
  } );

  // item details

  router.get( '/item/:itemId', function( req, res ) {
    "use strict";

    const itemId = parseInt( req.params.itemId );

    itemDao.getItem( itemId, function( item ) {
      if ( item == null ) {
        res.status( 404 ).send( "Item not found." );
        return;
      }

      let stars = 0;
      let numReviews = 0;
      let reviews = [];

      if ( "reviews" in item ) {
        numReviews = item.reviews.length;

        for ( let i = 0; i < numReviews; i++ ) {
          const review = item.reviews[ i ];
          stars += review.stars;
        }

        if ( numReviews > 0 ) {
          stars = stars / numReviews;
          reviews = item.reviews;
        }
      }

      itemDao.getRelatedItems( function( relatedItems ) {
        res.render( 'item', {
          userId: USERID,
          item: item,
          stars: stars,
          reviews: reviews,
          numReviews: numReviews,
          relatedItems: relatedItems
        } );
      } );
    } );
  } );

  // add item review

  router.post( '/item/:itemId/reviews', function( req, res ) {
    "use strict";

    const itemId = parseInt( req.params.itemId );
    const review = req.body.review;
    const name = req.body.name;
    const stars = parseInt( req.body.stars );

    itemDao.addReview( itemId, review, name, stars, function( item ) {
      res.redirect( '/item/' + itemId );
    } );
  } );

  // view cart

  router.get( '/cart', function( req, res ) {
    "use strict";

    res.redirect( '/user/' + USERID + '/cart' );
  } );

  router.get( '/user/:userId/cart', function( req, res ) {
    "use strict";

    const userId = req.params.userId;

    cartDao.getCart( userId, function( cart ) {
      const total = cartTotal( cart );

      res.render( 'cart', {
        userId: userId,
        updated: false,
        cart: cart,
        total: total
      } );
    } );
  } );

  // add to cart

  router.post( '/user/:userId/cart/items/:itemId', function( req, res ) {
    "use strict";

    const userId = req.params.userId;
    const itemId = parseInt( req.params.itemId );

    const renderCart = function( cart ) {
      let total = cartTotal( cart );
      res.render( 'cart', {
        userId: userId,
        updated: true,
        cart: cart,
        total: total
      } );
    };

    cartDao.itemInCart( userId, itemId, function( item ) {
      if ( item === null ) {
        itemDao.getItem( itemId, function( item ) {
          item.quantity = 1;
          cartDao.addItem( userId, item, function( cart ) {
            renderCart( cart );
          } );
        } );
      } else {
        cartDao.updateQuantity( userId, itemId, item.quantity + 1, function( cart ) {
          renderCart( cart );
        } );
      }
    } );
  } );

  // update quantities in cart

  router.post( '/user/:userId/cart/items/:itemId/quantity', function( req, res ) {
    "use strict";

    const userId = req.params.userId;
    const itemId = parseInt( req.params.itemId );
    const quantity = parseInt( req.body.quantity );

    cartDao.updateQuantity( userId, itemId, quantity, function( cart ) {
      let total = cartTotal( cart );
      res.render( 'cart', {
        userId: userId,
        updated: true,
        cart: cart,
        total: total
      } );
    } );
  } );

  // utilities

  function cartTotal( cart ) {
    "use strict";

    let total = 0;
    for ( let i = 0; i < cart.items.length; i++ ) {
      const item = cart.items[ i ];
      total += item.price * item.quantity;
    }
    return total;
  }

  // initialization

  app.use( '/', router );

  var server = app.listen( 3000, function() {
    var port = server.address().port;
    console.log( 'Mongomart server listening on port %s.', port );
  } );
} );
