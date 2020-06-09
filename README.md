# NK-Node
NK Central Libraries for NodeJS
------

#### This library is defined and offered to make connecting to:
1. NodeJS
2. Express
3. DIVI
4. Bitcoin


###### How to install the library
> npm i nk-node --save

###### How to include the library
> const NK = require( "nk-node" );

###### How to use express
> NK.xpr.load();

The express server can also be the SSL server (like a local web server), provide the location based on the domain name from let's encrypt 

> NK.xpr.load( "app.encke.com" );
> NK.xpr.add( "get", "/user/:id", ( res, ip, requestedDATA, cookieOrSession, filesPosted, hostname ) => {
>					//the res item is the same as always
>					//ip is the Source IP of the request
>					//requestedDATA is the paramaters, already formatted, in the request, in this example you can use requestedDATA.id the data is auto formatted to an object regardless or source
>					//cookieOrSession is the object of the cookie or override session function
>					//filesPosted is the object of the files posted from the request
>					//hostname is the name of the host in the request. this is useful when using virtual hosts in the same node core
>			if( parseInt( requestedDATA.id ) > 0 ) {
>				res.json( { user: "valid" } );
>			} else {
>				res.status( 400 ).json( { user: "invalid" } );
>			}
> });

The express server can also process user authentication

> NK.xpr.load( "app.encke.com" );
> NK.xpr.add( "get", "/user/:id", ( res, ip, requestedDATA, cookieOrSession, filesPosted, hostname ) => {
>					//the res item is the same as always
>					//ip is the Source IP of the request
>					//requestedDATA is the paramaters, already formatted, in the request, in this example you can use requestedDATA.id the data is auto formatted to an object regardless or source
>					//cookieOrSession is the object of the cookie or override session function
>					//filesPosted is the object of the files posted from the request
>					//hostname is the name of the host in the request. this is useful when using virtual hosts in the same node core
>			if( parseInt( requestedDATA.id ) > 0 ) {
>				res.json( { user: "valid" } );
>			} else {
>				res.status( 400 ).json( { user: "invalid" } );
>			}
> }, ( headers ) => {
>	return ( headers.auth == "isvalid" );
> });

#### GIT Webhook connection for PM2

###### How to install the GIT Webhook
1. Generate a private deploy key with no passphrase
> ssh-keygen -t rsa -b 4096 -C "REPLACETHISWITHTHEEMAIL" ; cat /home/ubuntu/.ssh/id_rsa.pub
2. Add the printed key to your Auto Deploy Keys (without WRITE access)
3. Add the hook in GitHub https://app.encke.com:3420/ set to post only the event (replace app.encke.com with your domain name)
4. Add this code to the start of your app.
> NK.selfDeploy( WHERETOFINDPRIVATEKEYS, DEPLOYTOFOLDER );
5. Run the follwoing command
> cd /var/www/ ; rm -rf html ; mkdir html ; cd html ; git clone git@github.com:Encke/NK-Node . ; pm2 start index.js; pm2 logs
6. When making a push to master, it will re-sync and restart.