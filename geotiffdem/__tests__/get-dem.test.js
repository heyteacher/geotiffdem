// Import all functions from get-by-id.js 
const gdal = require('../src/lib/gdal');

// This includes all tests for getByIdHandler() 
describe('Test dictionary', () => {

    const coords = [
        [65.535265, -18.2419936],
        [66.0426173, -18.1725832],
        [52.2629487, 10.4871186]
    ]

    // Test one-time setup and teardown, see more in https://jestjs.io/docs/en/setup-teardown 
    beforeAll(() => {
        jest.setTimeout(20000)
    });

    // Clean up mocks 
    afterAll(() => {});


    // This test invokes getByIdHandler() and compare the result  
    it('gdallocationinfo', async() => {
        for (const coord of coords) {
            console.log('gdal.getTiffByCoord(', coord[0], ',', coord[1], ')', gdal.getTiffByCoord(coord[0], coord[1]))
            const dem = await gdal.gdallocationinfo(coord[0], coord[1])
            expect(dem).toBeGreaterThanOrEqual(0)
        }
    });

});