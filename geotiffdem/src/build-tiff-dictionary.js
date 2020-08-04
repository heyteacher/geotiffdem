const aws = require('aws-sdk');
const s3 = new aws.S3();
const gdal = require('./lib/gdal');
const fs = require('fs')

const bucket = 'geo-tiff';
const dir = 'tiffs';

/**
 * list all geotiffs in S3 path specified, calcolate for each geotiff the bound and build the dictionary
 */
(async() => {
    try {
        const dictionary = {}
            // list the geotiff into bucket directory
        const list = await s3.listObjects({ Bucket: bucket, Prefix: dir }).promise();
        // for each geotiff found
        for (let index = 1; index < list.Contents.length; index++) {
            const content = list.Contents[index];
            // call gdallinfo
            const gdalinfoJson = await gdal.gdalinfo(bucket, content.Key)
                // extract bound coordinates fron JSON
            const coordinates = JSON.parse(gdalinfoJson).wgs84Extent.coordinates[0]
                // add bound coordinate to dictionary
            dictionary[content.Key.replace(`${dir}/`, '')] = [
                { latitude: coordinates[0][1], longitude: coordinates[0][0] },
                { latitude: coordinates[1][1], longitude: coordinates[1][0] },
                { latitude: coordinates[2][1], longitude: coordinates[2][0] },
                { latitude: coordinates[3][1], longitude: coordinates[3][0] }
            ]
        }
        // write the dictionary into src/lib/dictionary.js 
        const dictionaryJson = JSON.stringify(dictionary, null, 2)
        fs.writeFileSync('src/lib/dictionary.js', `module.exports = ${dictionaryJson}`)
        console.log('build dictionary with ', Object.keys(dictionary).length, 'TIFFs')
    } catch (error) {
        console.error(error)
    }
})()