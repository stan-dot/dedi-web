import { Box, Card, CardContent, Stack } from "@mui/material";
import {
  DataToHtml,
  DefaultInteractions,
  ResetZoomButton,
  SvgElement,
  VisCanvas,
  SvgRect,
  SvgLine,
} from "@h5web/lib";
import { Vector2, Vector3 } from "three";
import { useBeamstopStore } from "../data-entry/beamstopStore";
import { useDetectorStore } from "../data-entry/detectorStore";
import { useCameraTubeStore } from "../data-entry/cameraTubeStore";
import {
  createPlotEllipse,
  createPlotRange,
  createPlotRectangle,
  getDomains,
} from "./plotUtils";
import { usePlotStore } from "./plotStore";
import {
  BeamlineConfig,
  Beamstop,
  CircularDevice,
  Detector,
} from "../utils/types";
import { computeQrange } from "../calculations/qrange";
import { useBeamlineConfigStore } from "../data-entry/beamlineconfigStore";
import LegendBar from "./legendBar";
import ResultsBar from "../results/resultsBar";
import NumericRange from "../calculations/numericRange";
import { getPointForQ } from "../calculations/qvalue";
import { ScatteringOptions, useResultStore } from "../results/resultsStore";
import { ReciprocalWavelengthUnits, WavelengthUnits } from "../utils/units";
import {
  convertBetweenQAndD,
  convertBetweenQAndS,
} from "../results/scatteringQuantities";
import { color2String } from "./plotUtils";
import SvgAxisAlignedEllipse from "./svgEllipse";
import * as mathjs from "mathjs";

export default function CentrePlot(): JSX.Element {
  const plotConfig = usePlotStore();
  const beamlineConfig = useBeamlineConfigStore<BeamlineConfig>((state) => {
    return {
      angle: state.angle,
      cameraLength: state.cameraLength,
      minWavelength: state.minWavelength,
      maxWavelength: state.maxWavelength,
      minCameraLength: state.minCameraLength,
      maxCameraLength: state.maxCameraLength,
      cameraLengthStep: state.cameraLengthStep,
      wavelength: state.wavelength,
    };
  });
  const detector = useDetectorStore<Detector>((state) => {
    return {
      resolution: state.resolution,
      pixelSize: state.pixelSize,
    };
  });
  const beamstop = useBeamstopStore<Beamstop>((state) => {
    return {
      centre: state.centre,
      diameter: state.diameter,
      clearance: state.clearance,
    };
  });

  const cameraTube = useCameraTubeStore<CircularDevice>((state) => {
    return { centre: state.centre, diameter: state.diameter };
  });

  mathjs.createUnit("xpixel", detector.pixelSize.width.toString());
  mathjs.createUnit("ypixel", detector.pixelSize.height.toString());

  const { ptMin, ptMax, visibleQRange, fullQRange } = computeQrange(
    detector,
    beamstop,
    cameraTube,
    beamlineConfig,
  );

  // I am about here

  const beamstopCentre: { x: mathjs.Unit, y: mathjs.Unit } = {
    x: mathjs.unit(beamstop.centre.x ?? NaN, "x_pixel"),
    y: mathjs.unit(beamstop.centre.y ?? NaN, "y_pixel")
  }

  const cameraTubeCentre: { x: mathjs.Unit, y: mathjs.Unit } = {
    x: mathjs.unit(cameraTube.centre.x ?? NaN, "x_pixel"),
    y: mathjs.unit(cameraTube.centre.y ?? NaN, "y_pixel")
  }

  const plotBeamstop = createPlotEllipse(
    beamstopCentre,
    beamstop.diameter,
    plotConfig.plotAxes,
  );

  const plotCameraTube = createPlotEllipse(
    cameraTubeCentre,
    cameraTube.diameter,
    plotConfig.plotAxes,
  );

  const plotClearance = createPlotEllipse(
    beamstopCentre,
    mathjs.add(beamstop.diameter,),
    plotConfig.plotAxes,
  );

  const plotDetector = createPlotRectangle(
    new Vector3(0, 0),
    detector.resolution,
    plotConfig.plotAxes,
  );
  const plotVisibleRange = createPlotRange(
    new Vector3(ptMin.x, ptMin.y),
    new Vector3(ptMax.x, ptMax.y),
    detector.pixelSize,
    plotConfig.plotAxes,
  );

  const requestedRange = useResultStore<NumericRange | null>((state) => {
    if (!state.requestedMax || !state.requestedMin) {
      return null;
    }
    return NumericRange.createWithFunc(
      state.requestedMin,
      state.requestedMax,
      (value: number): number => {
        switch (state.requested) {
          case ScatteringOptions.d:
            if (state.dUnits === WavelengthUnits.angstroms) {
              value = angstroms2Nanometres(value);
            }
            value = convertBetweenQAndD(value);
            break;
          case ScatteringOptions.s:
            if (state.sUnits === WavelengthUnits.angstroms) {
              value = angstroms2Nanometres(value);
            }
            value = convertBetweenQAndS(value);
            break;
          default:
            if (state.qUnits === ReciprocalWavelengthUnits.angstroms) {
              value = nanometres2Angstroms(value);
            }
        }
        return value;
      },
    );
  });

  let requestedMinPt: Vector2 | null = new Vector2(0, 0);
  let requestedMaxPt: Vector2 | null = new Vector2(0, 0);
  if (
    requestedRange &&
    beamlineConfig.angle &&
    beamlineConfig.cameraLength &&
    beamlineConfig.wavelength
  ) {
    requestedMaxPt = getPointForQ(
      requestedRange.max * 1e9,
      beamlineConfig.angle,
      beamlineConfig.cameraLength,
      beamlineConfig.wavelength * 1e-9,
      new Vector2(plotBeamstop.centre.x, plotBeamstop.centre.y),
    );
    requestedMinPt = getPointForQ(
      requestedRange.min * 1e9,
      beamlineConfig.angle,
      beamlineConfig.cameraLength,
      beamlineConfig.wavelength * 1e-9,
      new Vector2(plotBeamstop.centre.x, plotBeamstop.centre.y),
    );
  }

  const plotRequestedRange = {
    start: new Vector3(requestedMinPt.x, requestedMinPt.y),
    end: new Vector3(requestedMaxPt.x, requestedMaxPt.y),
  };
  const domains = getDomains(plotDetector, plotConfig.plotAxes);

  // evil
  delete mathjs.Unit.UNITS.xpixel
  delete mathjs.Unit.UNITS.ypixel

  return (
    <Box>
      <Stack direction="column" spacing={1}>
        <Stack direction="row" spacing={1}>
          <Card>
            <CardContent>
              <div
                style={{
                  display: "grid",
                  height: "60vh",
                  width: "65vh",
                  border: "solid black",
                }}
              >
                <VisCanvas
                  abscissaConfig={{
                    visDomain: [domains.xAxis.min, domains.xAxis.max],
                    showGrid: true,
                  }}
                  ordinateConfig={{
                    visDomain: [domains.yAxis.max, domains.yAxis.min],
                    showGrid: true,
                  }}
                >
                  <DefaultInteractions />
                  <ResetZoomButton />
                  <DataToHtml
                    points={[
                      plotBeamstop.centre,
                      plotBeamstop.endPointX,
                      plotBeamstop.endPointY,
                      plotClearance.centre,
                      plotClearance.endPointX,
                      plotClearance.endPointY,
                      plotCameraTube.centre,
                      plotCameraTube.endPointX,
                      plotCameraTube.endPointY,
                      plotDetector.lowerBound,
                      plotDetector.upperBound,
                      plotVisibleRange.start,
                      plotVisibleRange.end,
                      plotRequestedRange.start,
                      plotRequestedRange.end,
                    ]}
                  >
                    {(
                      beamstopCentre,
                      beamstopEndPointX,
                      beamstopEndPointY,
                      clearanceCentre,
                      clearnaceEndPointX,
                      clearenaceEndPointY,
                      cameraTubeCentre,
                      cameraTubeEndPointX,
                      cameraTubeEndPointY,
                      detectorLower,
                      detectorUpper,
                      visibleRangeStart,
                      visableRangeEnd,
                      requestedRangeStart,
                      requestedRangeEnd,
                    ) => (
                      <SvgElement>
                        {plotConfig.cameraTube && (
                          <SvgAxisAlignedEllipse
                            coords={[
                              cameraTubeCentre,
                              cameraTubeEndPointX,
                              cameraTubeEndPointY,
                            ]}
                            fill={color2String(plotConfig.cameraTubeColor)}
                            id="camera tube"
                          />
                        )}
                        {plotConfig.detector && (
                          <SvgRect
                            coords={[detectorLower, detectorUpper]}
                            fill={color2String(plotConfig.detectorColour)}
                            id="detector"
                          />
                        )}
                        {plotConfig.inaccessibleRange && (
                          <SvgLine
                            coords={[beamstopCentre, visibleRangeStart]}
                            stroke={color2String(
                              plotConfig.inaccessibleRangeColor,
                            )}
                            strokeWidth={3}
                            id="inaccessible"
                          />
                        )}
                        {plotConfig.clearance && (
                          <SvgAxisAlignedEllipse
                            coords={[
                              clearanceCentre,
                              clearnaceEndPointX,
                              clearenaceEndPointY,
                            ]}
                            fill={color2String(plotConfig.clearanceColor)}
                            id="clearance"
                          />
                        )}
                        {plotConfig.visibleRange && (
                          <SvgLine
                            coords={[visibleRangeStart, visableRangeEnd]}
                            stroke={color2String(plotConfig.visibleColor)}
                            strokeWidth={3}
                            id="visible"
                          />
                        )}
                        {plotConfig.requestedRange && (
                          <SvgLine
                            coords={[requestedRangeStart, requestedRangeEnd]}
                            stroke={color2String(
                              plotConfig.requestedRangeColor,
                            )}
                            strokeWidth={3}
                            id="requested"
                          />
                        )}
                        {plotConfig.beamstop && (
                          <SvgAxisAlignedEllipse
                            coords={[
                              beamstopCentre,
                              beamstopEndPointX,
                              beamstopEndPointY,
                            ]}
                            fill={color2String(plotConfig.beamstopColor)}
                            id="beamstop"
                          />
                        )}
                      </SvgElement>
                    )}
                  </DataToHtml>
                </VisCanvas>
              </div>
            </CardContent>
          </Card>
          <Box flexGrow={1}>
            <LegendBar />
          </Box>
        </Stack>
        <ResultsBar visableQRange={visibleQRange} fullQrange={fullQRange} />
      </Stack>
    </Box>
  );
}
