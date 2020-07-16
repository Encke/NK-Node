# NK-Node
NK Central Libraries for NodeJS
------


## How to install the library

```bash
npm i nk-node --save
```

## How to include the library
```node
const NK = require( "nk-node" );
```

## How to use express

The express server can also be the SSL server (like a local web server), provide the location based on the domain name from let's encrypt

```node
NK.xpr.load();
NK.xpr.load( "mydomain.com" );
NK.xpr.add( "get", "/user/:id", ( res, ip, requestedDATA, cookieOrSession, filesPosted, hostname ) => {
				//the res item is the same as always
				//ip is the Source IP of the request
				//requestedDATA is the paramaters, already formatted, in the request, in this example you can use requestedDATA.id the data is auto formatted to an object regardless or source
				//cookieOrSession is the object of the cookie or override session function
				//filesPosted is the object of the files posted from the request
				//hostname is the name of the host in the request. this is useful when using virtual hosts in the same node core
		if( parseInt( requestedDATA.id ) > 0 ) {
			res.json( { user: "valid" } );
		} else {
			res.status( 400 ).json( { user: "invalid" } );
		}
});
```

The express server can also process user authentication

```node
NK.xpr.load( "mydomain.com" );
NK.xpr.add( "get", "/user/:id", ( res, ip, requestedDATA, cookieOrSession, filesPosted, hostname ) => {
				//the res item is the same as always
				//ip is the Source IP of the request
				//requestedDATA is the paramaters, already formatted, in the request, in this example you can use requestedDATA.id the data is auto formatted to an object regardless or source
				//cookieOrSession is the object of the cookie or override session function
				//filesPosted is the object of the files posted from the request
				//hostname is the name of the host in the request. this is useful when using virtual hosts in the same node core
		if( parseInt( requestedDATA.id ) > 0 ) {
			res.json( { user: "valid" } );
		} else {
			res.status( 400 ).json( { user: "invalid" } );
	}
}, ( headers ) => ( headers.auth == "isvalid" ) );
```

# Happy Coding!
