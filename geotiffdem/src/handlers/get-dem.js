const gdal = require('../lib/gdal')

/**
 * handler of DEM Api REST
 * @param {*} event: the event HTTP Request
 */
exports.getDemHandler = async(event) => {
    try {

        // only get is allowed
        if (event.httpMethod !== 'GET') {
            throw Error(`getMethod only accept GET method, you tried: ${event.httpMethod}`)
        }

        // calculate digital elevation and wrap into http response
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                status: true,
                dem: await gdal.gdallocationinfo(event.pathParameters.lat, event.pathParameters.lng)
            })
        };
        console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`)
        return response
    } catch (error) {
        // something goes wrong, if error message contains 'Unknow Error', server error (HTTP Status Code 500)
        // otherwise client error (HTTP Status Code 400)
        const response = {
            statusCode: error.message.indexOf('Unknow Error') >= 0 ? 500 : 400,
            body: JSON.stringify({
                status: false,
                message: `error: ${error.message}`
            })
        };
        console.error(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`)
        return response
    }
}