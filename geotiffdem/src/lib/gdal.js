const childProcess = require('child_process')
const geolib = require('geolib')
const dictionary = require('./dictionary')
const parser = require('xml2json');

/**
 * Execute the command in promise
 * @param {*} command the command to execute 
 */
const execPromise = function(command) {
    'use strict';
    return new Promise(function(resolve, reject) {
        childProcess.exec(command, { 'LD_LIBRARY_PATH': '/opt/lib' }, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

/** 
 * parse the XML response of gdallocationinfo and extract the digital elevation (or erroe)
 * @param {string} xml the xml to parse
 */
const parseGdallocationinfo = (xml) => {
    if (!xml) {
        throw Error('Out of Bounds')
    }
    // convert in json
    const demObj = parser.toJson(xml, { object: true })

    // digital elevation found
    if (demObj && demObj.Report && demObj.Report.BandReport && demObj.Report.BandReport.Value) {
        return demObj.Report.BandReport.Value > -10000 ? Math.round(demObj.Report.BandReport.Value) : 0
    }
    // found an alert, raise error with alert message
    else if (demObj && demObj.Report && demObj.Report.Alert) {
        throw Error(demObj.Report.Alert)
    }
    // no data found raise unknow error
    else {
        throw Error('Unknow Error')
    }
}

/**
 * get the digital elevation of lat lng coorginates
 * @param {*} lat latitude
 * @param {*} lng longitude
 */
exports.gdallocationinfo = async(lat, lng) => {
    // lat e lng must be set
    if (!lat || !lng) {
        throw Error(`Expected lat and lng. Found lat=${lat} lng=${lng}`)
    }
    // get the getotiff containing coordinate
    const tiff = exports.getTiffByCoord(lat, lng)
    if (tiff) {
        // get the xml containing digital elevation 
        const xml = await execPromise(`/opt/bin/gdallocationinfo /vsis3/${process.env.GEOTIFF_BUCKET_NAME}/${process.env.GEOTIFF_DIR_PATH}/${tiff} -xml -wgs84 ${lng} ${lat}`);
        // extract the digital elevation fron xml
        return parseGdallocationinfo(xml)
    }
    // coordinate out of geotiffs bound
    return null
}

/**
 * get the GDAL info containing bound of geotiff
 * @param {*} bucket the bucket which store  the geotiff
 * @param {*} geoTiffPath the geotiff path
 */
exports.gdalinfo = (bucket, geoTiffPath) => {
    return execPromise(`/opt/bin/gdalinfo /vsis3/${bucket}/${geoTiffPath} -json`);
}

/**
 * scan the geotiff dictionary and found the geotiff containing the lat/lng coordinates
 * @param {*} lat latitude
 * @param {*} lng longitude
 */
exports.getTiffByCoord = (lat, lng) => {
    for (const tiff in dictionary) {
        const polygon = dictionary[tiff];
        const isInPolygon = geolib.isPointInPolygon({ latitude: lat, longitude: lng }, polygon)
        if (isInPolygon) {
            return tiff
        }
    }
    return null
}