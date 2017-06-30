const MongoClient = require( 'mongodb' ).MongoClient,
  assert = require( 'assert' );

const COLLECTION_NAME = "item";
const ALL_CATEGORY = "All";

function ItemDao( database ) {
  "use strict";

  this.db = database;

  // get categories

  this.getCategories = function( callback ) {
    "use strict";

    const categories = [];

    // db.item.aggregate([ { $group: { _id: "$category", num: { $sum: 1 } } } ]).pretty()
    const cursor = this.db.collection( COLLECTION_NAME ).aggregate( [ {
      $group: {
        _id: "$category",
        num: {
          $sum: 1
        }
      }
    }, {
      $sort: {
        _id: 1
      }
    } ] );

    cursor.toArray( function( err, categories ) {
      assert.equal( null, err );
      assert.notEqual( null, categories );

      let totalCategories = 0;
      categories.forEach( function( category ) {
        totalCategories += category.num;
      } );

      categories.unshift( {
        _id: ALL_CATEGORY,
        num: totalCategories
      } );

      callback( categories );
    } );
  };

  // get items

  this.getItems = function( category, page, itemsPerPage, callback ) {
    "use strict";

    const query = buildCategoryQuery( category );

    const cursor = this.db.collection( COLLECTION_NAME ).find( query );
    cursor.sort( {
      _id: 1
    } );
    cursor.skip( page * itemsPerPage );
    cursor.limit( itemsPerPage );

    cursor.toArray( function( err, items ) {
      assert.equal( null, err );
      assert.notEqual( null, items );

      callback( items );
    } );
  }

  // get number of items for categor

  this.getNumItems = function( category, callback ) {
    "use strict";

    const query = buildCategoryQuery( category );

    const cursor = this.db.collection( COLLECTION_NAME ).find( query );

    cursor.count( function( err, numItems ) {
      assert.equal( null, err );
      assert.notEqual( null, numItems );

      callback( numItems );
    } );
  }

  // search items

  this.searchItems = function( searchQuery, page, itemsPerPage, callback ) {
    "use strict";

    const query = buildSearchQuery( searchQuery );

    const cursor = this.db.collection( COLLECTION_NAME ).find( query );
    cursor.sort( {
      _id: 1
    } );
    cursor.skip( page * itemsPerPage );
    cursor.limit( itemsPerPage );

    cursor.toArray( function( err, searchItems ) {
      assert.equal( null, err );
      assert.notEqual( null, searchItems );

      callback( searchItems );
    } );
  }

  // count search results

  this.getNumSearchItems = function( searchQuery, callback ) {
    "use strict";

    const query = buildSearchQuery( searchQuery );

    const cursor = this.db.collection( COLLECTION_NAME ).find( query );

    cursor.count( function( err, itemCount ) {
      assert.equal( null, err );
      assert.notEqual( null, itemCount );

      callback( itemCount );
    } );
  }

  // get item by id

  this.getItem = function( itemId, callback ) {
    "use strict";

    const query = {
      _id: itemId
    };

    const cursor = this.db.collection( COLLECTION_NAME ).find( query );

    cursor.toArray( function( err, items ) {
      assert.equal( null, err );
      assert.notEqual( null, items );

      if ( items.length > 0 ) {
        callback( items[ 0 ] );
      } else {
        callback( null );
      }
    } );
  }

  // add item review

  this.addReview = function( itemId, comment, name, stars, callback ) {
    "use strict";

    const review = {
      name: name,
      comment: comment,
      stars: stars,
      date: Date.now()
    }

    const query = {
      _id: itemId
    };

    const update = {
      $push: {
        reviews: review
      }
    }

    this.db.collection( COLLECTION_NAME ).updateOne( query, update, function( err, item ) {
      assert.equal( null, err );
      assert.notEqual( null, item );

      callback( item );
    } );
  }

  // get related items

  this.getRelatedItems = function( callback ) {
    "use strict";

    const cursor = this.db.collection( COLLECTION_NAME ).find( {} );
    cursor.limit( 4 );

    cursor.toArray( function( err, items ) {
      assert.equal( null, err );
      assert.notEqual( null, items );

      callback( items );
    } );
  }

  // utilities

  function buildCategoryQuery( category ) {
    const query = {};
    if ( category !== ALL_CATEGORY ) {
      query.category = category;
    }
    return query;
  }

  function buildSearchQuery( query ) {
    if ( query.trim() === "" ) {
      return {};
    } else {
      return {
        $text: {
          $search: query
        }
      };
    }
  }

  // mock data

  this.createDummyItem = function() {
    "use strict";

    const item = {
      _id: 1,
      title: "Gray Hooded Sweatshirt",
      description: "The top hooded sweatshirt we offer",
      slogan: "Made of 100% cotton",
      stars: 0,
      category: "Apparel",
      img_url: "/img/products/hoodie.jpg",
      price: 29.99,
      reviews: []
    };

    return item;
  }
}

module.exports.ItemDao = ItemDao;;
