var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var url = require('url');
var app = express();
app.set('view engine', 'ejs');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var assert = require ('assert');
var ObjectID = require('mongodb').ObjectID;
var formidable = require("formidable");
var urlencodedParser = bodyParser.urlencoded({extended:false});
var mongourl = 'mongodb://user:user@381f-shard-00-00-8efgx.mongodb.net:27017,381f-shard-00-01-8efgx.mongodb.net:27017,381f-shard-00-02-8efgx.mongodb.net:27017/test?ssl=true&replicaSet=381f-shard-0&authSource=admin&retryWrites=true&w=majority';

var SECRETKEY1 = 'key 1';
var SECRETKEY2 = 'key 2';

app.set('view engine','ejs','exif');

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));


app.get('/upload', function(req, res){
	res.status(200);
	res.render('upload',{});
});

app.post('/display', function(req, res){   //*//
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, photofields, files){
		var filename = files.filetoupload.path;
		if (files.filetoupload.type) {
		  var phototype = files.filetoupload.type;
		}

	  if(files.filetoupload.size > 0 ){
		  var display = true;
	  }else{
		  var display = false;
	  }

		var title = photofields.title;
		var description = photofields.description;

	  console.log("Title = " + title);
    console.log("Description = " + description);

	fs.readFile(filename, function(err,data) {
		MongoClient.connect(mongourl, function(err,db) {
		try {
		  assert.equal(err,null);
		  console.log('Connection Success.')
		} catch (err) {
		  res.set({"Content-Type":"text/plain"});
		  res.status(500).end("Connect Failed");
		}




			var ExifImage = require('exif').ExifImage;

			try {
			    new ExifImage({ image : filename }, function (error, exifData) {
				if (error)
				    console.log('Error: '+error.message);
				else{
          console.log(exifData);

				make = exifData.image.Make;
				model = exifData.image.Model;
				createon = exifData.image.ModifyDate;
        lat = exifData.gps.GPSLatitude;
        gps_laref = exifData.gps.GPSLatitudeRef;
        lon = exifData.gps.GPSLongitude;
        gps_loref = exifData.gps.GPSlogitudeRef;

        console.log(lat);
        console.log(lon);

				var photo_array = {};
				photo_array['title'] = title;
				photo_array['description'] = description;
				photo_array['make'] = make;
				photo_array['model'] = model;
				photo_array['createon'] = createon;

				if (files.filetoupload.size > 0 && phototype=="image/jpeg"){
					photo_array['phototype'] = phototype;
					photo_array['photo'] = new Buffer(data).toString('base64');
				}else{
					console.log("Not jpg");
				}

				insertPhoto(db,photo_array, function(result){
				  db.close();

				  res.render('display',{   //*//
					  title:title,
					  description:description,
					  make:make,
					  model:model,
					  createon:createon,
					  photo:photo_array['photo'],
					  phototype:phototype,
            lat:lat,
            lon:lon,
					  display:display,
			  	  	});
				});
			}
		});




			} catch (error) {
			    console.log('Error: ' +error.message);
			}
		});
	});
});
});

app.get("/gmap", urlencodedParser, function(req,res) {
    var parsedURL = url.parse(req.url,true);
    var query_Object = parsedURL.query;

  if (query_Object.lat != "" && query_Object.lon != "" && query_Object.name != "") {
    res.status(200);
    res.render('gmap', {lat:query_Object.lat, lon:query_Object.lon});
  }else{
    res.set({"Content-Type":"text/html"});
    res.status(404).end("<title>Error</title><h1>Name or lat or lon is missing.</h1><a href='/'>Go Back</a>");
  }
});



app.use(express.static(__dirname +  '/public'));



function insertPhoto(db,r,callback) {
  db.collection('newphoto').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("Insert successful!");
    callback(result);
  });
}


app.get('*', function(req,res) {
  res.status(404).end('File not found');
});

app.listen(process.env.PORT || 8099);
