import {ClientFunction, Selector} from 'testcafe'
import {createArrayCsvWriter} from 'csv-writer';
import distance from 'google-distance-matrix';
import moment from 'moment';


fixture`The Search`
    .page`https://www.domain.com.au/rent/?suburb=manly-nsw-2095,bondi-nsw-2026,queenscliff-nsw-2096,manly-vale-nsw-2093,clovelly-nsw-2031,bronte-nsw-2024&ptype=apartment-unit-flat,block-of-units,duplex,free-standing,new-apartments,new-home-designs,new-house-land,pent-house,semi-detached,studio,terrace,villa&bedrooms=2-any&bathrooms=1-any&price=0-600&excludedeposittaken=1`;

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
        if(!addressLine1) continue;

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
    const addressChunks = chunkArray(addresses, 15);

    let carDistances = [];
    let busDistances = [];

    for (const chunk of addressChunks) {
        carDistances = [...carDistances, ...(await getCarDistances(chunk)).rows];
        busDistances = [...busDistances, ...(await getBusDistances(chunk)).rows];
        console.log("Getting data from Google, rows processed: ", carDistances.length);
    }

    return carDistances.map((record, index) => {
        return {
            elements: [
                ...record.elements,
                ...busDistances[index].elements
            ]
        }
    })
}

function chunkArray(array, size) {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size);
        result.push(chunk)
    }
    return result
}

async function getCarDistances(addresses) {
    distance.key(process.env.API_KEY);
    distance.units('metric');
    distance.mode('driving');
    const monday7AMinUTC = moment.utc().add(1, 'weeks').startOf('isoWeek').subtract(3, 'hours') / 1000;
    distance.departure_time(monday7AMinUTC);

    return await new Promise(resolve => {
        distance.matrix(addresses, ['Bondi Beach', 'Manly Beach', '20 Berry St, North Sydney NSW 2060'], (err, data) => resolve(data));
    });
}

async function getBusDistances(addresses) {
    distance.key(process.env.API_KEY);
    distance.units('metric');
    distance.mode('transit');
    const monday7AMinUTC = moment.utc().add(1, 'weeks').startOf('isoWeek').subtract(3, 'hours') / 1000;
    distance.departure_time(monday7AMinUTC);

    return await new Promise(resolve => {
        distance.matrix(addresses, ['1 Smail St, Ultimo NSW 2007', '11/155 Clarence St, Sydney NSW 2000'], (err, data) => resolve(data));
    });
}

test('CSV these props', async t => {
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

    const distances = await getDistances(records);

    const recordsWithTimes = records.map((record, index) => {
        const distance = distances[index];
        const bondiDistance = Math.round(distance.elements[0].duration.value / 60.0);
        const manlyDistance = Math.round(distance.elements[1].duration.value / 60.0);
        const unityDistance = Math.round(distance.elements[2].duration.value / 60.0);
        const wwfDistance = Math.round(distance.elements[3].duration.value / 60.0);
        const pivotalDistance = Math.round(distance.elements[4].duration.value / 60.0);

        return [...record, bondiDistance, manlyDistance, unityDistance, wwfDistance, pivotalDistance]
    });

    const csvWriter = createArrayCsvWriter({
        header: ['Address', 'Link', 'Rent', 'Suburb', 'Bedrooms', 'Car space', 'Time to Bondi', 'Time To Manly', 'Time to Unity', 'Time to WWF by Transit', 'Time to Pivotal by Transit'],
        path: './rent.csv'
    });

    await csvWriter.writeRecords(recordsWithTimes);
});


