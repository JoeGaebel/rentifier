const {chunkArray, getAlreadyRated, getTravelDistances} = require("./helpers.js");
const {createArrayCsvWriter} = require("csv-writer");

async function getDistances(addresses) {
    const addressChunks = chunkArray(addresses, 15);

    const pointOfInterestAddresses = [
        'Tamarama Beach',
    ];

    let driveDistances = [];
    let walkDistances = [];

    for (const chunk of addressChunks) {
        driveDistances = [...driveDistances, ...(await getTravelDistances(chunk, pointOfInterestAddresses, 'driving')).rows];
        walkDistances = [...walkDistances, ...(await getTravelDistances(chunk, pointOfInterestAddresses, 'walking')).rows];
        console.log("Getting data from Google, rows processed: ", driveDistances.length);
    }
    return driveDistances.map((record, index) => {
        return {
            elements: [
                ...record.elements,
                ...walkDistances[index].elements
            ]
        }
    })
}

(async () => {
    const addresses = getAlreadyRated();
    const distances = await getDistances(addresses);

    const recordsWithTimes = addresses.map((address, index) => {
        const distance = distances[index];
        const tamDrive = Math.round(distance.elements[0].duration.value / 60.0);
        const tamWalk = Math.round(distance.elements[1].duration.value / 60.0);

        return [address, tamWalk, tamDrive]
    });

    const csvWriter = createArrayCsvWriter({
        header: ['Address', 'Tam walk', 'Tam drive'],
        path: './backfill.csv'
    });

    await csvWriter.writeRecords(recordsWithTimes);
})();
