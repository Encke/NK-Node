# NK-Node
NK Central Libraries for NodeJS

This library is defined and offered to make connecting to NodeJS, Express, DIVI, Bitcoin, shell commands, SSH Commands, web requests, cookies, all easy to use and with the least deployment time possible, allowing us to focus on development and not googling references every time we need to run functions. This repo is public to also inspire collaboraton!

include the library
const NK = require( "nk-node" );




start using express 
without SSL direct, when the SSL is managed by nginx or apache, the initializer shoild be null

NK.xpr.load();

If you want the express server to also be the SSL server (like a local web server) than you send the location of the private key file pair

NK.xpr.load( "/var/www/pks/web" );

you then need to load the express endpoints  

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
} );

a very common issue when converting existing systems to Express is the handelomv of authentication. 
aadd session check

GIT Webhook connection for PM2
How to install
	generate a private deploy key with no passphrase.
	Add the hook in GitHub https://mycoolserver.com:3420/ set to post only the event
#ssh-keygen -t rsa -b 4096 -C "your email" ; cat /home/ubuntu/.ssh/id_rsa.pub
	Save this result in Github under Settings -> deploy keys you DO NOT need write access for this hook
	Modify your /etc/nginx/sites-available/defualt
		server {
			listen 80;
			listen [::]:80;
			server_name mycoolserver.com;
			root /var/www/html;
			index index.html index.html;
			location / { try_files $uri $uri/ =404; }
		}
#systemctl restart nginx ; certbot certonly --nginx

Clone and install the repo
#npm i nk-node --save
#pm2 start index.js ; pm2 save


Add the hook in GitHub https://mycoolserver.com:3420/ set to post only the event

