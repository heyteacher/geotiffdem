
[![GitHub Sponsors](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/heyteacher)
[![Liberpay](http://img.shields.io/liberapay/receives/heyteacher.svg?logo=liberapay)](https://liberapay.com/heyteacher/donate)
[![GitHub license](https://img.shields.io/github/license/heyteacher/geotiffdem)](https://github.com/heyteacher/geotiffdem/blob/master/LICENSE)
[![GitHub commit](https://img.shields.io/github/last-commit/heyteacher/geotiffdem)](https://github.com/heyteacher/geotiffdem/commits/master)

Europe Digital Elevation by latitude and longitude  
===
__AWS Serverless Application__ which expose a REST API to extract __digital elevation__ by european latitude/longitude using __EU DEM 1.1__.

Public Demo
---
There is a public demo of application:
```
https://dp6yf9dpul.execute-api.eu-west-1.amazonaws.com/Prod/public/{lat}/{lng}
```
You can find a location in __Google Terrain__:
https://www.google.it/maps/@65.5427462,-18.2604901,14z/data=!5m1!1e4

and test the API:
https://dp6yf9dpul.execute-api.eu-west-1.amazonaws.com/Prod/public/65.5427462/-18.2604901

There is a __throttle__ configuration of 1 request per 20 seconds

EU DEM 1.1
---
__EU DEM 1.1__ (Digital Elevation Model) are 27 DEM Geotiffs 1000x1000 KM which cover the Europe with a __space resolution 25 meters__ and a __vertical precision +/- 7 meters__, provided by __Copernicus__ produced __with funding by the European Union__ and downlodable here: [EU DEM 1.1](https://land.copernicus.eu/imagery-in-situ/eu-dem/eu-dem-v1.1?tab=mapview). 

EU DEM Geotiffs elevation value are more and more precise and stable then GPS elevation value.

GDAL
---
[GDAL Library](https://gdal.org/) tool `gdallocationinfo` you can query these Geottiffs by latitude and longitude coordinated to extract the digital elevation. For instance:
```
gdallocationinfo eu_dem_v11_E30N40.TIF -wgs84 -18.278987 65.550225 -xml

<Report pixel="1910" line="817">
  <BandReport band="1">
    <Value>1315.36547851562</Value>
  </BandReport>
</Report>
```
The total size of 27 EU DEM Geotiffs is 46 GB, some Geotiff size is more then 4.6 GB.   

COG - Cloud Optimized Geotiff 
---
In order to use geotiffs in the cloud, [Cloud Optimized Geotiff](https://www.cogeo.org/) permit to query geotiff remotely downloading the only pieces of geotiff which contain the location requested, without download entirely TIF file, using __HTTP Range Header__ requests.  

__AWS Simple Storage Service__ (S3) support HTTP Range requests and __GDAL__ commands support S3 as virtual remote filesystem, so you can query a geotiff stored into a S3 bucket without download entirely Geotiff:
```
gdallocationinfo  /vsis3/<S3_BUCKET>/<S3_GEOTIFF_KEY> -wgs84 -18.278987 65.550225 -xml
```

geotiffdem Application
---
The Servlerless Application `geotiffdem` is composed by:

1. 27 Cloud Optimized Geotiff uploaded into a __S3 Bucket__
1. a __AWS Lambda Layer__ containing `gdallocationinfo` linux command
1. a __AWS Lambda Function__ based on layer expose a REST API `/{lat}/{lng}` and `/public/{lat}/{lng}` returning the elevation calling `gdallocationinfo` on the correct Geotiff   

### Geotiff on S3 Bucket
In order to reduce costs, geotiffs are uploaded into an S3 Bucket in __One Region-IA__ storage class. You can use __Standard__ storage class for High Availability constraint or you have a lot o requests, but you spend more.

Follow the [Cloud Optimized Geotiff developer guide](https://www.cogeo.org/developers-guide.html), the 27 geotiffs has been optimize with this `gdal_translate` command:
```
gdal_translate eu_dem_v11_E00N20.TIF optimized/eu_dem_v11_E00N20.TIF -co TILED=YES -co COPY_SRC_OVERVIEWS=YES -co COMPRESS=DEFLATE
```

This optimization reduces the total size form 46 GB to 30 GB and reduces the amount of byte returned bye HTTP Requests of a `gdallocationinfo` query. `cog_optimizer.sh` is a bash script optimize whicj all tiffs into a directory.

`gdalinfo` command calculated the bounds (four edge locations) of each geotiff. So the bounds are loaded into the dictionary `geotiffdem/src/lib/dictionary.js` queried by Lambda Function to find the Geotiff file containing latitude and longiture requested.

`geotiffdem/src/lib/dictionary.js` is generated one time after geotiffs are uploaded on S3 by the node script `geotiffdem/src/build-tiff-dictionary.js` via the command

```
cd geotiffdem
npm run dictionary
```
Before, you have to configure you credentials of a user able to read S3 bucket using `aws configure`

###  AWS Lambda Layer with GDAL commands 
No predefined lambda runtimes doesn't provide GDAL commands.

In order to provide these commands to your Lambda we have to create an __AWS Lambda Layer__ with GDAL's libraries and binaries.
 
To do this, you have to follow these general istructions, valid for any kind of Linux commands you want use in your lambda.

1. create a __EC2 Amazon Linux 2__ instance (which is the base of all Lambda runtime)
1. install the packages you need inside the layer
1. create a layer directory with `bin` and `lib` subdirs
1. discover the library dependencies of the command using `ldd <ABS_PATH_COMMAND>`
1. copy the library dependencies to `lib` subdir
1. copy the commands into `bin` subdir
1. zip `lib` and `bin` directories
1. copy into a S3 bucket
1. publish the lambda layer 

Specifying the layer ARN in `Layers` of your lambda configuration in __SAM Template__ `tempmate.yml`, you are able to invoke the commands via `/opt/bin/<COMMAND>` indipendently the runtime you choose.           

In this project we need a layer with `gdallocationinfo` and `gdalinfo` command so:

1. install from yum `make automake gcc gcc-c++ libcurl-devel sqlite-devel`
1. download and install from sources `proj-6.0.0` (dependency of GDAL)
1. download and install from sources `gdal-3.1.2` 
1. discover the lib dependencies of `gdallocationinfo` and `gdalinfo` using `ldd`
1. copy dependencies in `lib` e commands in `bin`
1. publish the layer

You can find the complete script here: [ec2-publish-gdal-layer.sh](./ec2-publish-gdal-layer.sh) 

This  GDAL Lambda Layer cam be used in combination of all Lambda runtimes based on __Amazon Linux 2__: NodeJs, Python, Java, Ruby, Go, .NET

###  AWS Lambda Function
The Lambda Function __getDemFunction__ is based on  runtime __nodejs12.x__ and use the GDAL __Lambda Layer__ published for this project.

This lambda gets from HTTP request latitude and longitude returning as HTTP response the digital elevation in this way:

1. query `dictionary.js` by latitude and longitude in order to find the geotiff file name containing the latitude longitude coordinates 
1. if geotiff is found, query the geotiff in S3 via `gdallocationinfo`
1. return an HTTP response containing the digital elevation 

The source code of lambda handler: `geotiffdem/src/handlers/get-dem.js`

The lambda function is exposed via  two __AWS Api Gateway__:

1. `/{lat}/{lng}` api  __API key__ protected with __Throttle__ configuration:
    * __Burst Limit__: 100 requests per second
    * __Rate Limit__: 10 requests per second
    To invoke the API REST you have to specify the API_KEY into `x-api-key` header:
    ```
    curl -H "x-api-key:<API_KEY>" https://<AWS_GATEWAY_ID>.execute-api.<AWS_REGION>.amazonaws.com/Prod/<LATITUDE>/<LONGITUDE> 
   ```
1. `/public/{lat}/{lng}` api without __API key__ protected with __Throttle__ configuration:
    * __Burst Limit__: 1 requests per second
    * __Rate Limit__: 1 requests per 20 seconds
   ```
        curl https://<AWS_GATEWAY_ID>.execute-api.<AWS_REGION>.amazonaws.com/Prod/public <LATITUDE>/<LONGITUDE> 
   ```
  
If these limits are exceeded, an `Too Many Requests` error is raised.

### SAM Template
Lambda, API Gateway configurations are defined into __SAM Template__ `tamplate.yml`. To deploy into a AWS region:
```
sam build
sam deploy
```

To install and use __SAM__ visit [SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

Profiling
---
The duration of lambda call is constantly 800 ms, except the first invocation when the lamba is initialized where the duration is 3000 ms (cold start)

The most expensive instruction is the `gdallocationinfo` execution on S3 geotiff where the duration is 650 ms circa.

Lambda Runtime is `nodejs12.x` and Lambda Memory Size allocated `128 Mb`

About Costs
---
In `Servless Application` you pay what you use, so you pay:

- per requests (Lambda and Api Gateway)
- per GB allocated in S3

Using [AWS Pricing Calculator](https://calculator.aws/) 1,000,000 requests per Year (83,000 requests per Month):

* S3 
  ```
  30 GB x 0.01 USD = 0.30 USD (S3 One Zone-IA storage cost)
  80,000 GET requests for S3 One Zone-IA Storage x 0.000001 USD per request = 0.08 USD (S3 One Zone-IA GET requests cost)
  0.30 USD + 0.08 USD = 0.38 USD (Total S3 One Zone-IA Storage and other costs)
  
  S3 One Zone - Infrequent Access (S3 One Zone-IA) cost (monthly): 0.38 USD
  ```

  _Data transfer between Lambda and S3 is free_

* API Gateway
  ```
  3.50 USD per million requests
  
  API Gateway Costs (Montly): 0.29 USD ( 3.50 USD / 12 months)
  ```

* AWS Lambda Function
  ```
  RoundUp (800) = 800 Duration rounded to nearest 100ms
  1,000,000 requests x 800 ms x 0.001 ms to sec conversion factor = 800,000.00 total compute (seconds)
  0.125 GB x 800,000.00 seconds = 100,000.00 total compute (GB-s)
  100,000.00 GB-s - 400000 free tier GB-s = -300,000.00 GB-s
  Max (-300000.00 GB-s, 0 ) = 0.00 total billable GB-s
  Max (0 monthly billable requests, 0 ) = 0.00 total monthly billable requests
  
  Lambda costs - With Free Tier (monthly): 0.00 USD (First milion requests are free)
  ```

Total Costs per Month (80,000 API requests): __0.67 USD__
Total Costs per Year (1,000,000 API requests): __8,04 USD__

Develoment
---
### Build TIFF Dictionary
```
npm run dictionary
```
alias of
```
node src/build-tiff-dictionary.js
```

### Testing
```
npm test
```

### Lambda Local Invocation 
```
sam build && sam local invoke getDemFunction --event events/event-get-dem.json
```

### SAM Deploy
```
sam build
sam deploy
```
