import { TripsLayer, TileLayer } from "@deck.gl/geo-layers";
import { HeatmapLayer, PathLayer, GeoJsonLayer } from "deck.gl";
import { PolygonLayer, SolidPolygonLayer, BitmapLayer, GridCellLayer, ScatterplotLayer, TextLayer, IconLayer } from '@deck.gl/layers';

import {
    LabeledIconLayer
} from "../BaseMapCustomLayers";

import { _hexToRgb } from "../../../GridEditor/EditorMap/EditorMap";

import building from "../../../../data/images/building.png";
import lawyer from "../../../../data/images/lawyer.png";

import ship_image from "../../../../data/images/AISIcons.png";

export function getABMLayer(fakeData, visible, zoomLevel, sliderTime, ABMmode) {
    return new TripsLayer({
        id: "ABM",
        visible: visible,
        data: fakeData.trips,
        getPath: (d) => d.path,
        getTimestamps: (d) => d.timestamps,
        getColor: (d) => {
            let col = _hexToRgb(
                fakeData.attr[ABMmode][d[ABMmode]].color
            );
            return col;
        },
        getWidth: 2,
        widthScale: zoomLevel,
        opacity: 0.8,
        rounded: true,
        trailLength: 500,
        currentTime: sliderTime,
        updateTriggers: {
            getColor: ABMmode,
        },
        transitions: {
            getColor: 500,
        },
    })
}

export function getAggregatedTripsLayer(fakeData, visible, ABMmode) {
    return new PathLayer({
        id: "AGGREGATED_TRIPS",
        visible: visible,
        _shadow: false,
        data: fakeData.trips,
        getPath: (d) => {
            const noisePath =
                Math.random() < 0.5
                    ? Math.random() * 0.00005
                    : Math.random() * -0.00005;
            for (let i in d.path) {
                d.path[i][0] = d.path[i][0] + noisePath;
                d.path[i][1] = d.path[i][1] + noisePath;
                d.path[i][2] = d.mode[0] * 2;
            }
            return d.path;
        },
        getColor: (d) => {
            let col = _hexToRgb(
                fakeData.attr[ABMmode][d[ABMmode]].color
            );
            return col;
        },
        opacity: 0.2,
        getWidth: 1.5,

        updateTriggers: {
            getColor: ABMmode,
        },
        transitions: {
            getColor: 500,
        },
    })
}

export function getRentCommissionLayer(data) {
    return new IconLayer({
        id: 'complaints-layer',
        data: data,
        getPosition: d => [d.Lon, d.Lat],
        pickable: true,
        getIcon: d => ({
            url: d.Complainer === "Huurder" ? lawyer : building,
            width: 128,
            height: 128,
            mask: true,
        }),
        getSize: d => 30,
        getColor: d => d.Winner === "Complainer" ? [66, 135, 245] : [255, 0, 0],
        opacity: 0.5
    });
}

export function getAISLayer(data) {
    let layers = [];
    layers.push(new ScatterplotLayer({
        id: 'ship-target-layer',
        data: data,
        pickable: true,
        opacity: 0.002,
        stroked: true,
        filled: true,
        radiusScale: 6,
        radiusMinPixels: 1,
        radiusMaxPixels: 100,
        lineWidthMinPixels: 1,
        getPosition: d => d.coordinates,
        getRadius: d => 2,
        getFillColor: d => [255, 140, 0],
        getLineColor: d => [0, 0, 0]
    }));

    layers.push(new LabeledIconLayer({
        id: 'ship-layer',
        data: data,
        pickable: true,
        getPosition: d => d.coordinates,
        getText: d => d.name,
        getTextSize: d => 16,
        getTextPixelOffset: [10, 10],
        getTextColor: [255, 255, 255],
        getTextBorderColor: [0, 0, 0],
        getTextBorderWidth: 6,
        textOutlineWidth: 10,
        getTextAngle: d => 0,
        getTextAnchor: 'start',
        getTextAlignmentBaseline: 'top',

        iconAtlas: ship_image,
        iconMapping: { shipForward: { x: 100, y: 1, width: 13, height: 20, mask: true } },
        getIcon: d => d.icon,
        getIconAngle: d => d.heading,
        getIconSize: d => 30,
        getIconColor: d => d.hasOwnProperty("color") ? d.color : [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)],
        transitions: {
            getPosition: {
                duration: 7500
            },
            getAngle: {
                duration: 1000
            }
        }
    }).renderLayers());
    return layers;
}

export function getLSTLayer() {
    return new BitmapLayer({
        id: 'bitmap-layer',
        bounds: [4.45313, 51.89948, 4.52568, 51.92680],
        image: 'https://raw.githubusercontent.com/pratyush1611/testDatasetCityScope/main/LST_jul_21_rotterdam.png'
    })
}


export function getAQILayer() {
    return new BitmapLayer({
        id: 'bitmap-layer',
        bounds: [4.45313, 51.89948, 4.52568, 51.92680],
        image: 'https://raw.githubusercontent.com/pratyush1611/testDatasetCityScope/main/Air_quality_27_aug_21.png'
    })
}

export function getAccessLayer(data, visible, colorRange, accessToggle) {
    return new HeatmapLayer({
        id: "ACCESS",
        visible: visible,
        colorRange: colorRange,
        radiusPixels: 200,
        opacity: 0.25,
        data: data,
        getPosition: (d) => d.coordinates,
        getWeight: (d) => d.values[accessToggle],
        updateTriggers: {
            getWeight: [accessToggle],
        },
    })
}

export function getCalibrationGridLayer(data) {
    return new GeoJsonLayer({
        id: 'geojson-layer',
        data: data,
        pickable: false,
        stroked: false,
        filled: false,
        extruded: false,
        wireframe: true,
        pointType: 'circle',
        lineWidthScale: 1,
        lineWidthMinPixels: 2,
        getFillColor: [160, 160, 180, 200],
        // getLineColor: d => colorToRGBArray(d.properties.color),
        getPointRadius: 10,
        getLineWidth: 5,
        getElevation: 10
    })
}

export function getTableBoundsLayer() {
    return new SolidPolygonLayer({
        // data: "E:/TU_Delft/job_hunt/YES_Delft/CityScope/datasets/layers/shp/cityScope_rotterdam_aoi_4326.geojson" ,
        data: [{ polygon: [[4.45366, 51.8998], [4.45366, 51.926761111111119], [4.5251, 51.926761111111119], [4.5251, 51.8998], [4.45366, 51.8998]] }],
        getPolygon: d => d.polygon,
        wireframe: true,
        getFillColor: [0, 105, 18, 0.88 * 255],
        getLineColor: [0, 0, 0],
        extruded: false
    })
}