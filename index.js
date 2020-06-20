const path					= require( 'path' );
const { execSync }			= require( 'child_process' );
const bcrypt				= require( 'bcryptjs' );
const cors					= require( 'cors' );
const cookiesMiddleware		= require( 'universal-cookie-express' );
const crypto				= require( 'crypto' );
const express				= require( 'express' );
const fs					= require( 'fs' );
const http					= require( 'http' );
const https					= require( 'https' );
const qS					= require( 'querystring' );
const fileUpload			= require( 'express-fileupload' );
const SOAP					= require( 'strong-soap' ).soap;
const SSH2					= require( 'ssh2' );
const eMailer				= require( 'nodemailer' );

const DIVI_FEE_PERCENT		= 0.0001;
const DIVI_MINIMUM			= 0.1;
const DIVI_FEE_MAX			= 100;
const SSNSZE				= 64;
const TIME_SECOND	= 1000;
const TIME_MINUTE	= ( 60 * TIME_SECOND );
const TIME_HOUR		= ( 60 * TIME_MINUTE );
const TIME_DAY		= ( 24 * TIME_HOUR );
const TIME_WEEK		= ( 7 * TIME_DAY );
const TIME_MONTH	= ( 30 * TIME_DAY );

module.exports = {
	db: null,
	qS: qS,
	crypto: crypto,
	app: null,
	TIME: { SECOND: TIME_SECOND,
			MINUTE: TIME_MINUTE, 
			HOUR: TIME_HOUR, 
			DAY: TIME_DAY, 
			WEEK: TIME_WEEK, 
			MONTH: TIME_MONTH },
	start: ( loadMongo, databaseName, telegramToken, telegramURL, callback ) => {
		if( loadMongo )	{
			module.exports.db = require( './mongo' );
		}
		if( telegramToken )	{
			module.exports.telegram.load( telegramToken, telegramURL );
		}
		if( loadMongo && databaseName )	{
			db.start( databaseName, "127.0.0.1", 27017, callback );
		}	else	{
			callback();
		}
	},
	shell: ( command ) => {
		let shellText = "";
		let shellResult = null;
		try	{
			shellResult = execSync( command, { stdio: 'pipe' } );
		}	catch( e )	{
			shellText = e.stderr.toString();
		}
		if( shellResult )	{
			shellText = shellResult.toString();
		}
		return shellText.trim();
	},
	coin: ( name, command ) => {
		let cmdResult = module.exports.shell( "/usr/local/bin/" + name.toLowerCase() + "-cli -conf=/var/coins/" + name + "/" + name.toLowerCase() + ".conf -datadir=/var/coins/" + name + "/ " + command );
		return ( ( cmdResult.substr( 0, 7 ) == "error: " )? cmdResult.substr( 7 ): cmdResult );
	},
	coinBal: ( name, addresses ) => {
		let balance = 0;
		if( name == "divi" )	{
			balance = module.exports.parse( module.exports.coin( name, ( "getaddressbalance '" + module.exports.stringify( { addresses: ( Array.isArray( addresses )? addresses: [addresses] ) } ) + "'" ) ) );
		}	else	{
			balance = { balance: parseFloat( module.exports.coin( name, ( "getreceivedbyaddress " + addresses ) ) * 100000000 ) };
		}
		return parseFloat( ( balance? balance.balance / 100000000: 0 ) );
	},
	coinRec: ( name, addresses ) => {
		return parseFloat( module.exports.parse( module.exports.coin( name, ( "getaddressbalance '" + module.exports.stringify( { addresses: ( Array.isArray( addresses )? addresses: [addresses] ) } ) + "'" ) ) ).received / 100000000 );
	},
	coinValidate: ( address ) => {
		let valid = false;
		if( address && ( address.length == 34 ) )	{
			let buf = module.exports.coin( name, ( "validateaddress " + address ) );
			if( buf && ( buf.length > 0 ) )	{
				let addressData = module.exports.parse( buf );
				valid = ( addressData && !!addressData.isvalid );
			}
		}
		return valid;
	},
	diviFee: ( amount ) => {
		let fee = ( DIVI_FEE_PERCENT * amount );
		return ( ( fee > DIVI_FEE_MAX )? DIVI_FEE_MAX: fee );
	},
	diviSend: ( fromAddr, toAddr, amount, callback ) => {
		if( amount > 0 )	{
			let distList = {};
			distList[toAddr] = amount;
			let privateKey = module.exports.divi( "dumpprivkey '" + fromAddr + "'" ).trim();
			let unspent = module.exports.parse( module.exports.divi( "listunspent 6 999999999 '" + module.exports.stringify( [ fromAddr ] ) + "'" ).trim() );
			let inputTrans = [];
			let inputTransSign = [];
			let inputTransSignPKs = [];
			let outputTrans = {};
			let totalDIVI = 0;
			for( let i = 0; i < unspent.length; i++ )	{
				if( unspent[i] && unspent[i].spendable )	{
					totalDIVI += unspent[i].amount;
					let transData = { txid: unspent[i].txid, vout: unspent[i].vout };
					inputTrans.push( transData );
					transData.scriptPubKey = unspent[i].scriptPubKey;
					inputTransSign.push( transData );
					inputTransSignPKs.push( privateKey );
				}
			}
			if( totalDIVI > 0 )	{
				let remaining = ( totalDIVI - amount - module.exports.diviFee( totalDIVI ) );
				if( remaining > DIVI_MINIMUM )	{
					distList[fromAddr] = remaining;
				}
				let transHex = module.exports.divi( "createrawtransaction '" + module.exports.stringify( inputTrans ) + "' '" + module.exports.stringify( distList ) + "'" );
				if( transHex && ( transHex.length > 60 ) )	{
					let transBuff = module.exports.parse( module.exports.divi( "signrawtransaction '" + transHex + "' '" + module.exports.stringify( inputTransSign ) + "' '" + module.exports.stringify( inputTransSignPKs ) + "'" ) );
					if( transBuff && transBuff.hex && ( transBuff.hex.length > 20 ) )	{
						let transHash = transBuff.hex;
						callback( module.exports.divi( "decoderawtransaction '" + transHash + "'" ) );
						//callback( module.exports.divi( "sendrawtransaction '" + transHash + "'" ) );
						callback = null;
					}
				}
			}
		}
		if( callback )	{
			callback( null );
		}
	},
	now: () => {
		return ( new Date() ).getTime();
	},
	md5: ( value ) => {
		return module.exports.crypto.createHash( "md5" ).update( value ).digest( "hex" );
	},
	bcryptCreate: ( plainTextPassword, saltRounds, callback ) => bcrypt.genSalt( ( saltRounds? saltRounds: 10 ), ( err, salt ) => bcrypt.hash( plainTextPassword, salt, ( err, hash ) => callback( hash ) ) ),
	bcryptCompare: ( plainTextPassword, encryptedPassword, callback ) => bcrypt.compare( plainTextPassword, encryptedPassword.replace( '$2y$', '$2a$' ), ( err, correct ) => callback( correct ) ),
	isoDatetime: ( start ) => {
		let thisDateString = "";
		try	{
			thisDateString = ( new Date( start? parseInt( start ): null ) ).toISOString();
		}	catch ( e )	{}
		return thisDateString;
	},
	replaceAll: ( findThis, replace, string ) => {
		return string.split( findThis ).join( replace );
	},
	onlyNums: ( string ) => {
		return string.replace( /[^0-9]/g, "" );
	},
	objCopy: ( copyThis ) => {
		return module.exports.parse( module.exports.stringify( copyThis ) );
	},
	stringify: ( data ) => {
		let response = "";
		try	{
			response = JSON.stringify( data );
		}	catch( error )	{}
		return response;
	},
	parse: ( data ) => {
		let response = null;
		try	{
			response = JSON.parse( data );
		}	catch( error )	{}
		return response;
	},
	addCommas: ( x ) => {
		let parts = x.toString().split( "." );
		parts[0] = parts[0].replace( /\B(?=(\d{3})+(?!\d))/g, "," );
		return parts.join( "." );
	},
	randomString: ( length ) => {
		let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let text = "";
		while( text.length < length )	{
			text += possible.charAt( Math.floor( Math.random() * possible.length ) );
		}
		return text;
	},
	randomInt: ( min, max ) => {
		return Math.floor( Math.random() * ( Math.floor( max ) - Math.ceil( min ) + 1 ) ) + Math.ceil( min );
	},
	files: {
		getDirList: ( folder ) => {
			return fs.readdirSync( folder );
		},
		read: ( fileName ) => {
			try	{
				return fs.readFileSync( fileName, "utf8" );
			}	catch( e )	{
				return null;
			}
		},
		mkdir: ( folder ) => fs.mkdirSync( folder ),
		rmdir: ( folder ) => fs.rmdirSync( folder ),
		delete: ( fileName ) => fs.unlinkSync( fileName ),
		exists: ( fileName ) => fs.existsSync( fileName ),
		write: ( fileName, fileData ) => fs.writeFileSync( fileName, fileData ),
		append: ( fileName, fileData ) => fs.appendFileSync( fileName, fileData ),
		copy: ( sourceFile, destFile ) => fs.copyFileSync( sourceFile, destFile ),
		untar: ( fileName, extractTo ) => fs.createReadStream( fileName ).pipe( gunzip() ).pipe( tar.extract( extractTo ) )
	},
	getIPData: ( ip, callback ) => module.exports.http( true, "ipfind.co", "GET", 443, null, ( "/?ip=" + ip + "&auth=60bb060e-9601-412e-8a49-891cf1c1402f" ), null, ( webData ) => callback( module.exports.parse( webData ) ) ),
	getIP: ( req ) => {
		let thisIP = ( req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress
			|| ( req.connection.socket? req.connection.socket.remoteAddress: null ) );
		return ( ( ( thisIP && ( thisIP.substr( 0, 7 ) == "::ffff:" ) ) && module.exports.checkIP( thisIP.substr( 7 ) ) )? thisIP.substr( 7 ): thisIP );
	},
	checkIP: ( ip ) => {
		return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test( ip );
	},
	checkEmail: ( email ) => {
		return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test( email );
	},
	xpr: {
		homeFileLocation: null,
		keyCertFile: null,
		load: ( keyCertFile ) => {
			module.exports.xpr.keyCertFile = keyCertFile;
			module.exports.app = express();
			module.exports.app.use( express.urlencoded( { extended: false } ) );
			module.exports.app.use( express.json() );
			module.exports.app.use( cors() );
			module.exports.app.use( cookiesMiddleware() );
			module.exports.app.use( fileUpload() );
		},
		start: ( port, callback ) => ( module.exports.xpr.keyCertFile? https.createServer( { key: module.exports.files.read( "/etc/letsencrypt/live/" + module.exports.xpr.keyCertFile + "/privkey.pem" ), cert: module.exports.files.read( "/etc/letsencrypt/live/" + module.exports.xpr.keyCertFile + "/fullchain.pem" ) }, module.exports.app ): module.exports.app ).listen( port, callback ),
		add: ( type, path, callback, sessionCheck ) => {
			if( sessionCheck )	{
				module.exports.app[type]( path, ( req, res, next ) => sessionCheck( ( ( req.headers.authorization && sessionCheck )? req.headers.authorization.replace( "bearer ", "" ): "" ), ( session ) => {
					
					console.log( req.originalUrl );
					
					callback( res, module.exports.getIP( req ), ( ( !req.body || ( module.exports.stringify( req.body ) == "{}" ) )? ( ( !req.params || ( module.exports.stringify( req.params ) == "{}" ) )? req.query: req.params ): req.body ), session, req.files, req.hostname );
				}));
			}	else {
				module.exports.app[type]( path, ( req, res, next ) => callback( res, module.exports.getIP( req ), ( ( !req.body || ( module.exports.stringify( req.body ) == "{}" ) )? ( ( !req.params || ( module.exports.stringify( req.params ) == "{}" ) )? req.query: req.params ): req.body ), req.universalCookies, req.files, req.hostname ) );
			}
		}
	},
	http: ( secure, webHost, webMethod, webPort, webHeader, webPath, webData, callback ) => {
		try {
			let webObj = { host: webHost, port: webPort, method: webMethod, path: webPath };
			if( webHeader )	{
				webObj.headers = webHeader;
			}
			let webReq = ( secure? https: http ).request( webObj, ( res ) => {
				res.setEncoding( "utf8" );
				let webData = "";
				res.on( "data", ( httpsData ) => { webData += httpsData; } );
				res.on( "end", () => callback( webData, false ) );
				res.on( "error", ( e ) => callback( e.message, true ) );
			});
			webReq.on( "error", ( e ) => callback( e.message, true ) );
			if( webReq && webData )	{
				webReq.write( ( typeof( webData ) == "object" )? module.exports.stringify( webData ): webData );
			}
			webReq.end();
		}	catch ( e )	{
			callback( e.message, true );
		}
	},
	session: {
		name: null,
		get: ( cookies ) => {
			if( !module.exports.session.name )	{
				module.exports.session.name = module.exports.randomString( SSNSZE );
			}
			let sessionID = cookies.get( module.exports.session.name );
			if( !sessionID || ( sessionID.length < SSNSZE ) )	{
				sessionID = module.exports.randomString( SSNSZE );
				cookies.set( module.exports.session.name, sessionID );
			}
			return sessionID;
		}
	},
	ssh_shell: ( ip, portNumber, user, rawTextPassword, pkData, passPhrase, command, callback ) => {
		let options = { host: ip, port: portNumber, username: user };
		if( rawTextPassword && ( rawTextPassword.length > 0 ) )	{
			options.password = rawTextPassword;
		}	else if( pkData && ( pkData.length > 0 ) ) {
			options.privateKey = pkData;
			if( passPhrase && ( passPhrase.length > 0 ) ) {
				options.passphrase = passPhrase;
			}
		}
		let serverConnect = new SSH2.Client();
		serverConnect.on( 'ready', () => {
			let commandsToRun = ( ( typeof( command ) == "string" )? [ command ]: command );
			let responseText = "";
			let runNextServerCommand = () => {
				let thisCommand = commandsToRun.shift();
				if( thisCommand )	{
					responseText += thisCommand + "\nRESPONSE\n";
					serverConnect.exec( ( thisCommand + "\n" ), ( err, stream ) => {
						if( err )	{
							runNextServerCommand();
						}	else {
							stream.on( 'data', ( data ) => {
								responseText += data.toString();
							});
							stream.stderr.on( 'data', ( data ) => {
								responseText += data.toString();
							});
							stream.on( 'close', ( code, signal ) => {
								runNextServerCommand();
							});
						}
					});
				}	else	{
					serverConnect.end();
					callback( null, responseText );
				}
			};
			runNextServerCommand();
		});
		serverConnect.on( "error", ( data ) => callback( data.toString(), null ) );
		serverConnect.connect( options );
	},
	telegram: {
		id: null,
		load: ( token, postBackTo ) => {
			module.exports.telegram.id = token;
			if( postBackTo )	{
				module.exports.telegram.send( "setWebhook", { url: postBackTo, max_connections: 100, allowed_updates: [ "message", "edited_message", "channel_post", "edited_channel_post", "inline_query", "chosen_inline_result", "poll" ] }, ( result ) => console.log( "Telegram set", result ) );
			}
		},
		send: ( method, data, callback ) => module.exports.http( true, "api.telegram.org", "post", 443, { "Content-Type": "application/json" }, ( "/bot" + module.exports.telegram.id + "/" + method ), data, callback ),
		message: ( id, message, parseMode, silent, callback ) => module.exports.telegram.send( "sendMessage", { chat_id: id, text: message, parse_mode: ( parseMode? parseMode: "HTML" ), disable_notification: ( silent? true: false ) }, callback ),
	},
	soap: ( wsdlFile, callback ) => SOAP.createClient( wsdlFile, {}, ( err, client ) => callback( client ) ),
	email: {
		account: null,
		transporter: null,
		load: ( hostName, portNumber, authUser, authPassword ) => {
			module.exports.email.transporter = eMailer.createTransport( { host: hostName, port: ( portNumber? parseInt( portNumber ): 465 ), secure: true, auth: { user: authUser, pass: authPassword }, tls: { rejectUnauthorized: false } } );
			module.exports.email.transporter.verify( ( error, success ) => {
				if( !success )	{
					module.exports.email.transporter = null;
					console.log( "SMTP Cannot connect: " + error );
					setTimeout( () => module.exports.email.load( hostName, portNumber, authUser, authPassword ), ( 10 * 60 * 1000 ) );
				}
			});
		},
		send: ( fromEmail, toEmail, subjectEmail, plainText, html, callback ) => {
			if( module.exports.email.transporter )	{
				let options = { from: fromEmail, to: toEmail, subject: subjectEmail };
				if( plainText )	{
					options.text = plainText;
				}
				if( html )	{
					options.html = html;
				}
				module.exports.email.transporter.sendMail( options, callback );
			}	else	{
				callback( "No SMTP connected", null );
			}
		}
	},
	selfDeploy: ( sslCert, deployTo, callback ) => {
		let app	= express();
		let sslKey = null;
		let sslCertData = null;
		let process = ( req, res, next ) => {
			try	{
				console.log( module.exports.shell( "/bin/sh " + __dirname + "/gitDeploy.sh " + deployTo ) );
			}	catch( e )	{
				console.log( e )
			}
			res.end( "" );
		};
		app.post( "/", process );
		app.get( "*", process );
		if( fs.existsSync( sslCert + "/privkey.pem" ) )	{
			sslKey = fs.readFileSync( ( sslCert + "/privkey.pem" ), "utf8" );
			if( sslKey && fs.existsSync( sslCert + "/fullchain.pem" ) )	{
				sslCertData = fs.readFileSync( ( sslCert + "/fullchain.pem" ), "utf8" );
			}
		}
		if( sslKey && sslCertData )	{
			https.createServer( { key: sslKey, cert: sslCertData }, app ).listen( 3420, () => {
				console.log( "Githook enabled with SSL" );
				if( callback )	{
					callback();
				}
			});
		}	else {
			http.createServer( app ).listen( 3420, () => {
				console.log( "Githook enabled UNSECURE" );
				if( callback )	{
					callback();
				}
			});
		}
	}
};