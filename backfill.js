const {chunkArray, getAlreadyRated, getTravelDistances} = require("./helpers.js");
const {createArrayCsvWriter} = require("csv-writer");

async function getDistances(addresses) {
    const addressChunks = chunkArray(addresses, 15);

    const pointOfInterestAddresses = [
        'Coogee Beach',
        'Bronte Beach',
    ];

    let carDistances = [];

    for (const chunk of addressChunks) {
        carDistances = [
            ...carDistances,
            ...(await getTravelDistances(chunk, pointOfInterestAddresses, 'driving')).rows
        ];
        console.log("Getting data from Google, rows processed: ", carDistances.length);
    }
    return carDistances;
}

(async () => {
    const addresses = getAlreadyRated();
    const distances = await getDistances(addresses);

    const recordsWithTimes = addresses.map((address, index) => {
        const distance = distances[index];
        const coogeeDistance = Math.round(distance.elements[0].duration.value / 60.0);
        const bronteDistance = Math.round(distance.elements[1].duration.value / 60.0);

        return [address, coogeeDistance, bronteDistance]
    });

    const csvWriter = createArrayCsvWriter({
        header: ['Address', 'Time to Coogee', 'Time to Bronte'],
        path: './backfill.csv'
    });

    await csvWriter.writeRecords(recordsWithTimes);
})();
