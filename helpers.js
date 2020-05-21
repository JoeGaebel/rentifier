const distance = require("google-distance-matrix");
const moment = require("moment");
const fs = require("fs");

exports.getTravelDistances = async function (propertyAddresses, pointOfInterestAddresses, mode) {
    if(!['walking', 'driving', 'bicycling', 'transit'].includes(mode)) {
        throw Error("mode needs to be either 'walking', 'driving', 'bicycling', 'transit'")
    }
    distance.key(process.env.API_KEY);
    distance.units('metric');
    distance.mode(mode);
    const monday7AMinUTC = moment.utc().add(1, 'weeks').startOf('isoWeek').subtract(3, 'hours') / 1000;
    distance.departure_time(monday7AMinUTC);

    return await new Promise(resolve => {
        distance.matrix(propertyAddresses, pointOfInterestAddresses, (err, data) => resolve(data));
    });
};

exports.chunkArray = function (array, size) {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size);
        result.push(chunk)
    }
    return result
};

exports.getAlreadyRated = function () {
    const properties = fs.readFileSync('alreadyRated.txt').toString().split("\n");
    const indexOfEmptyString = properties.indexOf("");
    if (indexOfEmptyString > -1) {
        properties.splice(indexOfEmptyString, 1);
    }

    return properties;
};
