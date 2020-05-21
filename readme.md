# Rentifier
### Setup
1. `npm install`
2. Get a Google API Key https://developers.google.com/maps/documentation/distance-matrix/get-api-key
3. Associate the Distance Matrix API with the App you made above in Google Console
4. Fill `alreadyRated.txt` with addresses to skip, one per line
5. `API_KEY=your-api-key npm scrape`
6. Find `rent.csv`

### Backfilling
1. Fill up the `alreadyRated.txt`
2. run `API_KEY=your-api-key npm backfill`
3. Find `backfill.csv`
