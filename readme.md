# Rentifier
### Setup
0. `npm install`
1. Go on Domain and do a search with criteria you're interested in (ie. rent, bedrooms, etc). Copy that URL and replace the Test Cafe fixture URL in scrapeProperties.js
2. Update the points of interest and column names in scrapeProperties.js
3. Get a Google API Key https://developers.google.com/maps/documentation/distance-matrix/get-api-key
4. Associate the Distance Matrix API with the App you made above in Google Console
5. Fill `alreadyRated.txt` with addresses to skip, one per line (to save your google $$$)
6. `API_KEY=your-api-key npm scrape`
7. Find `rent.csv`, import into Google Sheets/Excel, add conditional formatting colour gradients, filtering, etc 
8. Voila
![](https://user-images.githubusercontent.com/9356287/83102056-076a6180-a0f7-11ea-948b-f1addd43c27a.png)

### Backfilling
1. Fill up the `alreadyRated.txt`
2. run `API_KEY=your-api-key npm backfill`
3. Find `backfill.csv`
