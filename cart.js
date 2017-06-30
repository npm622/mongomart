const MongoClient = require( 'mongodb' ).MongoClient,
  assert = require( 'assert' );

const COLLECTION_NAME = "cart";

function CartDao( database ) {
  "use strict";

  this.db = database;

  // get cart

  this.getCart = function( userId, callback ) {
    "use strict";

    const query = {
      userId: userId
    }

    const cursor = this.db.collection( COLLECTION_NAME ).find( query );

    cursor.toArray( function( err, carts ) {
      assert.equal( null, err );
      assert.notEqual( null, carts );

      if ( carts.length > 0 ) {
        callback( carts[ 0 ] );
      } else {
        callback( null );
      }
    } );
  }

  // find item in cart

  this.itemInCart = function( userId, itemId, callback ) {
    // db.cart.aggregate([ { $match: { userId: '558098a65133816958968d88' } }, { $unwind: "$items" }, { $match: { 'items._id': 22 } } ]).pretty()

    const cursor = this.db.collection( COLLECTION_NAME ).aggregate( [ {
      $match: {
        userId: userId
      }
    }, {
      $unwind: '$items'
    }, {
      $match: {
        'items._id': itemId
      }
    }, {
      $project: {
        _id: 0,
        userId: 1,
        item: '$items'
      }
    } ] );

    cursor.toArray( function( err, results ) {
      assert.equal( null, err );
      assert.notEqual( null, results );

      if ( results.length > 0 ) {
        callback( results[ 0 ].item );
      } else {
        callback( null );
      }
    } );
  }

  // add an item to the CartDao

  this.addItem = function( userId, item, callback ) {
    "use strict";

    const query = {
      userId: userId
    };

    const update = {
      $push: {
        items: item
      }
    };

    const options = {
      upsert: true,
      returnOriginal: false
    };

    this.db.collection( COLLECTION_NAME ).findOneAndUpdate( query, update, options, function( err, result ) {
      assert.equal( null, err );
      assert.notEqual( null, result );

      callback( result.value );
    } );
  }

  // update quantity for item in cart

  this.updateQuantity = function( userId, itemId, quantity, callback ) {
    "use strict";

    const query = {
      userId: userId,
      'items._id': itemId
    };

    const update = {};
    if ( quantity === 0 ) {
      update.$pull = {
        items: {
          _id: itemId
        }
      }
    } else {
      update.$set = {
        'items.$.quantity': quantity
      }
    }

    const options = {
      returnOriginal: false
    };

    this.db.collection( COLLECTION_NAME ).findOneAndUpdate( query, update, options, function( err, result ) {
      assert.equal( null, err );
      assert.notEqual( null, result );

      callback( result.value );
    } );
  }
}

module.exports.CartDao = CartDao;
