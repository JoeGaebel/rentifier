import {ClientFunction, Selector} from 'testcafe'
import {createArrayCsvWriter} from 'csv-writer';
import {chunkArray, getAlreadyRated, getTravelDistances} from "./helpers";

fixture`The Search`
    .page`https://www.domain.com.au/rent/?suburb=bondi-nsw-2026,clovelly-nsw-2031,bronte-nsw-2024,bellevue-hill-nsw-2023,woollahra-nsw-2025,randwick-nsw-2031,tamarama-nsw-2026,queens-park-nsw-2022,north-bondi-nsw-2026,waverley-nsw-2024&ptype=apartment-unit-flat,block-of-units,duplex,free-standing,new-apartments,new-home-designs,new-house-land,pent-house,semi-detached,studio,terrace,villa&bedrooms=1-3&bathrooms=1-any&price=0-550&excludedeposittaken=1`;

const checkIfOnLastPage = ClientFunction(() => {
    return document.querySelectorAll('[data-testid=paginator-navigation-button]')[1].disabled
});

const getData = ClientFunction(() => {
    const properties = document.querySelectorAll('[data-testid^=listing-card-wrapper]');

    const results = [];
    for (const property of properties) {
        const rentText = property.querySelector('[data-testid=listing-card-price-wrapper]').innerText;
        if (!rentText.match(/.*(\$\d{3}).*/)) continue;

        const rentAmount = rentText.match(/.*(\$\d{3}).*/)[1];
        const link = property.querySelector('a').href;
        const addressLine1 = (property.querySelector('[data-testid=address-line1]') || {}).innerText;
        if (!addressLine1) continue;

        const addressLine2 = property.querySelector('[data-testid=address-line2]').innerText;
        const suburb = property.querySelector('[itemprop=addressLocality]').innerText;

        const bedrooms = property.querySelector('[data-testid=property-features-text-container]').innerText.substring(0, 1);
        const carSpaces = property.querySelectorAll('[data-testid=property-features-text-container]')[2].innerText.substring(0, 1);
        const carSpacesText = carSpaces.replace('1', 'YES').replace('−', 'NO');

        results.push([addressLine1 + addressLine2, link, rentAmount, suburb, bedrooms, carSpacesText])
    }

    return results;
});

async function getDistances(records) {
    const addresses = records.map(record => record[0]);
    const addressChunks = chunkArray(addresses, 10);

    const drivingPointsOfInterest = [
        'Bronte Beach',
        'Tamarama Beach',
        'Bondi Beach',
        'Manly Beach',
        '20 Berry St, North Sydney NSW 2060',
        '11/155 Clarence St, Sydney NSW 2000'
    ];

    const transitPointsOfInterest = [
        '20 Berry St, North Sydney NSW 2060',
        '11/155 Clarence St, Sydney NSW 2000'
    ];

    const walkingPointsOfInterest = [
        'Bronte Beach',
        'Tamarama Beach',
        'Bondi Beach',
        'Manly Beach',
    ];

    let drivingDistances = [];
    let transitDistances = [];
    let walkingDistances = [];

    for (const chunk of addressChunks) {
        drivingDistances = [...drivingDistances, ...(await getTravelDistances(chunk, drivingPointsOfInterest, 'driving')).rows];
        transitDistances = [...transitDistances, ...(await getTravelDistances(chunk, transitPointsOfInterest, 'transit')).rows];
        walkingDistances = [...walkingDistances, ...(await getTravelDistances(chunk, walkingPointsOfInterest, 'walking')).rows];
        console.log("Getting data from Google, rows processed: ", drivingDistances.length);
    }

    return drivingDistances.map((record, index) => {
        return {
            elements: [
                ...record.elements,
                ...transitDistances[index].elements,
                ...walkingDistances[index].elements
            ]
        }
    })
}

function getDistanceFromElement(element) {
    if (element.duration) {
        return Math.round(element.duration.value / 60)
    }
    else return "???"
}

test('CSV these props', async t => {
    const alreadyRated = getAlreadyRated();
    console.log(`Found ${alreadyRated.length} already rated properties`);

    let isOnLastPage;
    let records = [];

    while (!isOnLastPage) {
        isOnLastPage = await checkIfOnLastPage();
        const pageRecords = await getData();
        records = [...records, ...pageRecords];

        const nextPageButton = await Selector('[data-testid=paginator-navigation-button]')
            .withText("next page");

        await t.click(nextPageButton);
        console.log('Collected data, records are', records.length)
    }

    const filteredRecords = records.filter(record => {
        return !alreadyRated.includes(record[0])
    });

    const distances = await getDistances(filteredRecords);

    if (distances.length !== filteredRecords.length) {
        console.log(JSON.stringify(filteredRecords));
        console.log("=--------------------------------------------");
        console.log(JSON.stringify(distances));
        throw Error("Distances and Filtered records out of sync")
    }

    const recordsWithTimes = filteredRecords.map((record, index) => {
        const distance = distances[index];

        // Driving distances
        const drivingToBronte = getDistanceFromElement(distance.elements[0]);
        const drivingToTam = getDistanceFromElement(distance.elements[1]);
        const drivingToBondi = getDistanceFromElement(distance.elements[2]);
        const drivingToManly = getDistanceFromElement(distance.elements[3]);
        const drivingToUnity = getDistanceFromElement(distance.elements[4]);
        const drivingToPivotal = getDistanceFromElement(distance.elements[5]);

        // Transit Distances
        const transitToUnity = getDistanceFromElement(distance.elements[6]);
        const transitToPivotal = getDistanceFromElement(distance.elements[7]);

        // Walking distances
        const walkingToBronte = getDistanceFromElement(distance.elements[8]);
        const walkingToTam = getDistanceFromElement(distance.elements[9]);
        const walkingToBondi = getDistanceFromElement(distance.elements[10]);
        const walkingToManly = getDistanceFromElement(distance.elements[11]);

        return [
            ...record,
            walkingToBronte,
            drivingToBronte,
            walkingToTam,
            drivingToTam,
            walkingToBondi,
            drivingToBondi,
            walkingToManly,
            drivingToManly,
            transitToUnity,
            drivingToUnity,
            transitToPivotal,
            drivingToPivotal
        ]
    });

    const csvWriter = createArrayCsvWriter({
        header: [
            'Address',
            'Link',
            'Rent',
            'Suburb',
            'Bedrooms',
            'Car space',
            'Bronte Walk',
            'Bronte Drive',
            'Tam Walk',
            'Tam Drive',
            'Bondi Walk',
            'Bondi Drive',
            'Manly Walk',
            'Manly Drive',
            'Unity Transit',
            'Unity Drive',
            'Pivotal Transit',
            'Pivotal Drive'
        ],
        path: './rent.csv'
    });

    await csvWriter.writeRecords(recordsWithTimes);
});
