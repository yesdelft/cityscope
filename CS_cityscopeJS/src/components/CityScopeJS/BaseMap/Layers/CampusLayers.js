import { HeatmapLayer, PathLayer, GeoJsonLayer } from "deck.gl";

export function getConstructionDateLayer(data, colorScale) {
    return new GeoJsonLayer({
        id: 'geojson-construction-date-layer',
        data: data,
        opacity: 0.8,
        getFillColor: f => {
            return colorScale(f.year);
        },
        positionFormat: "XYZ",
        transitions: {
            getFillColor: 500
        },
        updateTriggers: {
            getFillColor: data
        }
    });
}

export function getBuildingMetricLayer(metric, data, colorScale, timePoint) {
    return new GeoJsonLayer({
        id: metric + 'geojson-layer-smart',
        data: data,
        stroked: false,
        filled: true,
        opacity: 0.8,
        extruded: false,
        getLineWidth: f => { return 1; },
        getFillColor: f => {
            // console.log("Im filling ", timePoint, f.usage[timePoint]["energy"]);
            return colorScale(f.usage[timePoint]["energy"]);
        },
        positionFormat: "XYZ",
        transitions: {
            getFillColor: 500
        },
        updateTriggers: {
            getFillColor: timePoint
        }
    });
}
