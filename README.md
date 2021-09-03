# CityScope
## Backend

### environments

CityScoPy and the rest of the code are run in different environments, so each will require the creation of a separate environment.

#### CityScoPy

* Create environment with Python version 3.9
* Install dependencies as specified in `CityScoPy/requirements.txt`

#### General

Setting up the environments for this project was a nightmare. We created a requirements file, but geopandas and its requirements currently need to be installed separately
for it to work properly. 

* Create environment with Python version 3.9
* run `conda install --channel conda-forge geopandas`
* Install dependencies as specified in `requirements.txt`

### Running everything

This will run the CityScoPy scanner, functionality to send the results of the scanner to the server, as well as a basic indicator module which displays heat maps on offices
if there are more than X offices, and otherwise displace the heat maps on some predefined parks. For testing purposes, only the type of the first table cell is currently updated.

* run `CS_CityScoPy/run.py` with CityScoPy environment
* run `scanning.py` with general environment
* run `city.py` with general environment
* navigate to https://cityscope.media.mit.edu/CS_cityscopeJS/?cityscope=yourtest to see results

### Additional explanation

#### CityScoPy 

Executing `run.py` will run the CS_CityScoPy scanner system. This system will use a connected video capturing device to scan a 4x4 black/white Lego brick configuration for each table cell. 
Depending on the code mapping specified,
it will send an array of tuples containing the scanned types and their rotation to the CityIO server or a local server over UDP. E.g. if you have a 2 x 2 table grid, 
[[1, 0], [1, 0], [0, 0], [0, 0]] means that the scanned first row contained cells with a Lego brick configuration corresponding to type 1, while the second row was type 0.

The settings for the scanner can be configured in the `cityscopy.json` file. If the scanner crashes upon initialization, modify `camId` to the appropriate video capturing device.
`tags` contains binary strings which define which Lego brick configuration corresponds to which cell type. E.g. ["0000000000000000", "0011111111111111"] means that cell type 0
corresponds to all-black Lego bricks, while for cell type 1, the first 2 bricks in the first column are black, while the rest are white

The keystone can be modified with `keystone.txt`, with the order of the corners being top left, top right, bottom left, bottom right. The mechanisms for modifying the keystone with the GUI
do not seem to work, so it is useful to modify the code to continually read the keystone data while running so that manual changes in the keystone file are reflected in the GUI without having to restart the scanner.

#### Scanning.py

As the server endpoint which the CityScoPy code was sending the scanned data to did not exist, the code was modified to save the scanned data to `scanner_data.txt`.
The file `scanning.py` then periodically checks for updates in the file and manually sends the updated cell type data to modify the cell types in the server. For testing purposes,
it currently only updates type data for the first cell.

#### City.py

The file `city.py` runs the backend modules as defined in `indicators.py`. Whenever the table is updated (e.g. when a cell type changes), it will recompute indicator data and send it to the
server. Currently, it simply displays `Corona` heat maps on every office if there are more than X amount of offices, otherwise it displays the heat maps on some parks.

### Improvements for the future

Send it to the right endpoint

to do
-how to modify the scanner
-possibly sending type data to the server
-how to set up the urban indicator and mobility scanner and maybe doing gamma
-explaining core compound

## Frontend

This project is set up in JavaScript using node react

### Setup
* first clone this repo and checkout to main branch
* install node JS on your system , it can be downloaded from [here](https://nodejs.org/en/)
* once installed, you need to setup the JS project and install all dependencies for this , go to the directory of `CS_cityscopeJS` and run the command `npm install` from a terminal. Typically it takes around 8-10 minutes for installation.
* once the installation has taken place, we are good to go , run the command `npm start`
* It will take a while to initialize and once done, the webpage should pop up in the default browser with the address of (http://localhost:3000/CS_cityscopeJS)
* To access the rotterdam project you need to change the URL to (http://localhost:3000/CS_cityscopeJS/?cityscope=yourtest)
