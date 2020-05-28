const mongo		=	require( 'mongodb' ).MongoClient;
const objectid	=	require( 'mongodb' ).ObjectID;

let mongoDBJSObject = {
	db: null,
	retryTimeout: 100,
	insertList: {},
	deleteList: {},
	updateList: {},
	databaseList: {},
	id: ( name ) => {
		return objectid( name );
	},
	start: ( dbName, ip, port, callback ) => {
		mongo.connect( ( "mongodb://" + ip + ":" + port + "/" + dbName ), { useNewUrlParser: true, useUnifiedTopology: true }, ( err, db ) => {
			if( !err && db )	{
				mongoDBJSObject.databaseList[dbName] = db.db( dbName );
				mongoDBJSObject.databaseList[dbName].collection( dbName );
				if( callback )	{
					callback();
				}
			}	else	{
				console.log( "Database Connection Error: " + err );
			}
		});
	},
	insert: ( dbName, table, rowOrRows, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			if( mongoDBJSObject.insertList[table] )	{
				setTimeout( () => mongoDBJSObject.insert( dbName, table, rowOrRows, callback ), mongoDBJSObject.retryTimeout );
			}	else	{
				mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
					if( Array.isArray( rowOrRows ) )	{
						mongoDBJSObject.insertList[table] = 1;
						collection.insertMany( rowOrRows, () => mongoDBJSObject.insertDone( table, callback ) );
					}	else	{
						mongoDBJSObject.insertList[table] = 1;
						collection.insertOne( rowOrRows, () => mongoDBJSObject.insertDone( table, callback ) );
					}
				});
			}
		}
	},
	insertDone: ( table, callback ) => {
		if( mongoDBJSObject.insertList[table] )	{
			mongoDBJSObject.insertList[table]--;
			if( mongoDBJSObject.insertList[table] < 1 )	{
				delete mongoDBJSObject.insertList[table];
			}
		}
		if( callback )	{
			callback();
		}
	},
	delete: ( dbName, table, dataToRemove, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			if( mongoDBJSObject.deleteList[table] )	{
				setTimeout( () => mongoDBJSObject.delete( dbName, table, dataToRemove, callback ), mongoDBJSObject.retryTimeout );
			}	else	{
				mongoDBJSObject.deleteList[table] = true;
				mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => collection.deleteMany( dataToRemove, () => mongoDBJSObject.deleteDone( table, callback ) ) );
			}
		}
	},
	deleteDone: ( table, callback ) => {
		if( mongoDBJSObject.deleteList[table] )	{
			delete mongoDBJSObject.deleteList[table];
		}
		if( callback )	{
			callback();
		}
	},
	update: ( dbName, table, dataToUpdate, newData, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			if( mongoDBJSObject.updateList[table] )	{
				setTimeout( () => mongoDBJSObject.update( dbName, table, dataToUpdate, newData, callback ), mongoDBJSObject.retryTimeout );
			}	else	{
				mongoDBJSObject.updateList[table] = true;
				mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => collection.updateMany( dataToUpdate, { $set: newData }, () => mongoDBJSObject.updateDone( table, callback ) ) );
			}
		}
	},
	updateDone: ( table, callback ) => {
		if( mongoDBJSObject.updateList[table] )	{
			delete mongoDBJSObject.updateList[table];
		}
		if( callback )	{
			callback();
		}
	},
	singleQuery: ( dbName, table, query, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
				collection.findOne( query, ( err, item ) => {
					if( callback )	{
						callback( item );
					}
				});
			});
		}
	},
	query: ( dbName, table, query, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
				collection.find( query ).toArray( ( err, items ) => {
					if( callback )	{
						callback( items );
					}
				});
			});
		}
	},
	join: ( dbName, table, tableIDField, joinTo, joinToIDField, joinedToElement, sortBy, query, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
				let lkData = { $lookup: { from: joinTo, localField: tableIDField, foreignField: joinToIDField, as: joinedToElement } };
				collection.aggregate( [ lkData, { $match: query } ], { $sort: sortBy } ).toArray( ( err, items ) => {
					if( callback )	{
						callback( items );
					}
				});
			});
		}
	},
	joinsLimit: ( dbName, table, joins, max, sortBy, query, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
				let lookupdata = [];
				for( let i = 0; i < joins.length; i++ )	{
					let lookupDataItem = { from: joins[i].from, localField: joins[i].field, foreignField: joins[i].fromField, as: joins[i].name };
					if( joins[i].query )	{
						lookupDataItem.let = { $match: joins[i].query };
					}
					lookupdata.push( { $lookup: lookupDataItem } );
				}
				lookupdata.push( { $match: query } )
				collection.aggregate( lookupdata, { $sort: sortBy, $limit: max } ).toArray( ( err, items ) => {
					if( callback )	{
						callback( items );
					}
				});
			});
		}
	},
	querySort: ( dbName, table, sortBy, query, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
				collection.find( query ).sort( sortBy ).toArray( ( err, items ) => {
					if( callback )	{
						callback( items );
					}
				});
			});
		}
	},
	queryLimitSort: ( dbName, table, max, sortBy, query, callback ) => {
		if( mongoDBJSObject.databaseList[dbName] )	{
			mongoDBJSObject.databaseList[dbName].collection( table, ( err, collection ) => {
				collection.find( query ).limit( max ).sort( sortBy ).toArray( ( err, items ) => {
					if( callback )	{
						callback( items );
					}
				});
			});
		}
	}
};
module.exports = mongoDBJSObject;