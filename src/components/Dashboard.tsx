import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCw, Activity, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { DataLogger, LoggedCalculation } from '../utils/dataLogger';
import { loadGoogleCharts } from '../utils/googleChartsLoader';
import { THYROID_REFERENCE_RANGES } from '../constants/medical.constants';
import { SavedReports } from './SavedReports';

interface TSHPoint {
  timestamp: number;
  label: string;
  tsh: number;
}

// TSH Reference ranges
const TSH_NORMAL_LOW = THYROID_REFERENCE_RANGES.TSH.low; // 0.4
const TSH_NORMAL_HIGH = THYROID_REFERENCE_RANGES.TSH.high; // 4.5

// Get TSH status based on value
const getTSHStatus = (tsh: number): { status: 'normal' | 'high' | 'low'; label: string; color: string } => {
  if (tsh < TSH_NORMAL_LOW) {
    return { status: 'low', label: 'Below Normal (Hyperthyroid Risk)', color: 'text-red-600' };
  } else if (tsh > TSH_NORMAL_HIGH) {
    return { status: 'high', label: 'Above Normal (Hypothyroid Risk)', color: 'text-red-600' };
  }
  return { status: 'normal', label: 'Normal Range', color: 'text-green-600' };
};

const Dashboard: React.FC = () => {
  const [points, setPoints] = useState<TSHPoint[]>([]);
  const [chartReady, setChartReady] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartImageUri, setChartImageUri] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<any>(null);
  const chartReadyListenerRef = useRef<any>(null);

  const refreshData = useCallback(() => {
    try {
      const calculations: LoggedCalculation[] = DataLogger.getLoggedCalculations();
      const seen = new Set<string>();
      const trend = calculations
        .filter(calc => typeof calc.input.currentTSH === 'number' && calc.input.currentTSH !== null)
        .map(calc => {
          const ts = new Date(calc.timestamp).getTime();
          const dateKey = new Date(ts).toISOString().split('T')[0];
          const signature = `${dateKey}_${calc.input.currentTSH}`;
          if (seen.has(signature)) return null;
          seen.add(signature);
          return {
            timestamp: ts,
            tsh: Number(calc.input.currentTSH),
            label: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          };
        })
        .filter((value): value is TSHPoint => value !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
      setPoints(trend);
    } catch (error) {
      console.error('Failed to load TSH history:', error);
      setPoints([]);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    let active = true;
    loadGoogleCharts()
      .then(() => {
        if (active) {
          setChartReady(true);
          setChartError(null);
        }
      })
      .catch(error => {
        console.error('Google Charts failed to load', error);
        if (active) {
          setChartError('Unable to load Google Charts. Please refresh the page.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!chartReady || !chartContainerRef.current || !points.length) {
      setChartImageUri(null);
      return;
    }

    const google = (window as any).google;
    if (!google?.visualization?.ComboChart) {
      setChartError('Google Charts not available in this browser.');
      return;
    }

    // Calculate dynamic Y-axis range based on data
    const tshValues = points.map(p => p.tsh);
    const dataMin = Math.min(...tshValues);
    const dataMax = Math.max(...tshValues);

    // Extend range to show zones clearly
    const yMin = Math.max(0, Math.min(dataMin - 1, TSH_NORMAL_LOW - 0.5));
    const yMax = Math.max(dataMax + 2, TSH_NORMAL_HIGH + 2);

    // Create data table with TSH values plus zone columns
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('date', 'Date');
    dataTable.addColumn('number', 'TSH (mIU/L)');
    dataTable.addColumn('number', 'Normal Zone Lower');
    dataTable.addColumn('number', 'Normal Zone Upper');
    dataTable.addColumn('number', 'Danger Zone High');

    // Tooltip role for TSH line
    dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

    points.forEach(point => {
      const status = getTSHStatus(point.tsh);
      const tooltipHtml = `
        <div style="padding: 10px; font-family: sans-serif;">
          <strong>${new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong><br/>
          <span style="font-size: 16px; font-weight: bold; color: ${status.status === 'normal' ? '#16a34a' : '#dc2626'};">
            TSH: ${point.tsh.toFixed(2)} mIU/L
          </span><br/>
          <span style="color: ${status.status === 'normal' ? '#16a34a' : '#dc2626'};">
            ${status.label}
          </span>
        </div>
      `;

      dataTable.addRow([
        new Date(point.timestamp),
        point.tsh,
        TSH_NORMAL_LOW,    // Normal zone lower bound
        TSH_NORMAL_HIGH - TSH_NORMAL_LOW, // Normal zone height (stacked area)
        yMax - TSH_NORMAL_HIGH, // Danger zone high
        tooltipHtml
      ]);
    });

    const options = {
      legend: { position: 'bottom', textStyle: { color: '#4b5563', fontSize: 12 } },
      backgroundColor: 'transparent',
      chartArea: { left: 70, right: 30, top: 30, bottom: 80 },
      tooltip: { isHtml: true, trigger: 'both' },
      hAxis: {
        title: 'Date',
        titleTextStyle: { color: '#6b7280', italic: false, bold: true },
        textStyle: { color: '#4b5563' },
        format: 'MMM d',
        gridlines: { color: '#f3f4f6' }
      },
      vAxis: {
        title: 'TSH (mIU/L)',
        titleTextStyle: { color: '#6b7280', italic: false, bold: true },
        textStyle: { color: '#4b5563' },
        gridlines: { color: '#e5e7eb' },
        minValue: yMin,
        maxValue: yMax,
        viewWindow: { min: yMin, max: yMax },
        ticks: [
          { v: 0, f: '0' },
          { v: TSH_NORMAL_LOW, f: `${TSH_NORMAL_LOW} (Low)` },
          { v: 2.5, f: '2.5' },
          { v: TSH_NORMAL_HIGH, f: `${TSH_NORMAL_HIGH} (High)` },
          { v: 10, f: '10' },
          { v: 20, f: '20' }
        ].filter(t => t.v <= yMax)
      },
      seriesType: 'area',
      series: {
        0: {
          type: 'line',
          color: '#2563eb',
          lineWidth: 3,
          pointSize: 8,
          pointShape: 'circle'
        },
        1: {
          type: 'area',
          color: '#fef2f2', // Light red for hypo zone
          areaOpacity: 0.5,
          lineWidth: 0,
          visibleInLegend: false
        },
        2: {
          type: 'area',
          color: '#dcfce7', // Light green for normal zone
          areaOpacity: 0.6,
          lineWidth: 0,
          visibleInLegend: false
        },
        3: {
          type: 'area',
          color: '#fef2f2', // Light red for hyper zone
          areaOpacity: 0.5,
          lineWidth: 0,
          visibleInLegend: false
        }
      },
      isStacked: true,
      focusTarget: 'category',
      interpolateNulls: true,
      animation: {
        startup: true,
        duration: 500,
        easing: 'out'
      }
    };

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = new google.visualization.ComboChart(chartContainerRef.current);
    }

    if (chartReadyListenerRef.current) {
      google.visualization.events.removeListener(chartReadyListenerRef.current);
    }

    chartReadyListenerRef.current = google.visualization.events.addListener(
      chartInstanceRef.current,
      'ready',
      () => {
        try {
          const uri = chartInstanceRef.current?.getImageURI();
          if (uri) setChartImageUri(uri);
        } catch (err) {
          console.warn('Unable to capture chart image.', err);
        }
      }
    );

    chartInstanceRef.current.draw(dataTable, options);
  }, [chartReady, points]);

  const latestTSH = points.length ? points[points.length - 1] : null;
  const latestStatus = latestTSH ? getTSHStatus(latestTSH.tsh) : null;

  const summaryStats = useMemo(() => {
    if (!points.length) {
      return { min: 0, max: 0, avg: 0, window: 'N/A', normalCount: 0, abnormalCount: 0 };
    }
    const tshValues = points.map(p => p.tsh);
    const min = Math.min(...tshValues);
    const max = Math.max(...tshValues);
    const avg = tshValues.reduce((a, b) => a + b, 0) / tshValues.length;
    const normalCount = points.filter(p => p.tsh >= TSH_NORMAL_LOW && p.tsh <= TSH_NORMAL_HIGH).length;
    const abnormalCount = points.length - normalCount;
    const window =
      points.length > 1
        ? `${new Date(points[0].timestamp).toLocaleDateString()} - ${new Date(
          points[points.length - 1].timestamp
        ).toLocaleDateString()}`
        : new Date(points[0].timestamp).toLocaleDateString();
    return { min, max, avg, window, normalCount, abnormalCount };
  }, [points]);

  const handleDownloadImage = () => {
    if (!chartImageUri) return;
    const link = document.createElement('a');
    link.href = chartImageUri;
    link.download = `tsh-trend-${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  };

  return (
    <>
      <section className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">TSH Trend Dashboard</h2>
                <p className="text-sm text-blue-100">
                  Track your thyroid health over time with visual zone indicators
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshData}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={!chartImageUri}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${chartImageUri
                  ? 'bg-white text-blue-600 hover:bg-blue-50'
                  : 'bg-white/30 text-white/50 cursor-not-allowed'
                  }`}
              >
                <Download className="h-4 w-4" />
                <span>Save Chart</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Zone Legend */}
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-200 border border-green-400"></div>
              <span className="text-gray-700">Normal Zone ({TSH_NORMAL_LOW} - {TSH_NORMAL_HIGH} mIU/L)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
              <span className="text-gray-700">Abnormal Zone (Risk Area)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-600"></div>
              <span className="text-gray-700">Your TSH Values</span>
            </div>
          </div>

          {chartError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {chartError}
            </div>
          )}

          {points.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No TSH Data Yet</h3>
              <p className="text-gray-500">
                Submit a dosage calculation to start tracking your TSH trends over time.
              </p>
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div ref={chartContainerRef} className="w-full h-80" aria-label="TSH trend chart with zones" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Latest TSH Card */}
                <div className={`p-5 rounded-xl border-2 ${latestStatus?.status === 'normal'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-semibold uppercase tracking-wide ${latestStatus?.status === 'normal' ? 'text-green-700' : 'text-red-700'
                      }`}>
                      Latest TSH
                    </p>
                    {latestStatus?.status === 'normal' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : latestStatus?.status === 'high' ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className={`text-3xl font-bold ${latestStatus?.status === 'normal' ? 'text-green-900' : 'text-red-900'
                    }`}>
                    {latestTSH?.tsh.toFixed(2)} <span className="text-lg font-medium">mIU/L</span>
                  </p>
                  <p className={`text-xs mt-1 ${latestStatus?.status === 'normal' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {latestStatus?.label}
                  </p>
                </div>

                {/* Entries Card */}
                <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide mb-2">
                    Total Entries
                  </p>
                  <p className="text-3xl font-bold text-blue-900">{points.length}</p>
                  <div className="text-xs text-blue-600 mt-1 flex items-center space-x-3">
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                      {summaryStats.normalCount} normal
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                      {summaryStats.abnormalCount} abnormal
                    </span>
                  </div>
                </div>

                {/* TSH Range Card */}
                <div className="p-5 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-sm text-purple-700 font-semibold uppercase tracking-wide mb-2">
                    Your TSH Range
                  </p>
                  <p className="text-xl font-bold text-purple-900">
                    {summaryStats.min.toFixed(2)} – {summaryStats.max.toFixed(2)} <span className="text-sm font-medium">mIU/L</span>
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Average: {summaryStats.avg.toFixed(2)} mIU/L
                  </p>
                </div>

                {/* Time Window Card */}
                <div className="p-5 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-700 font-semibold uppercase tracking-wide mb-2">
                    Observation Period
                  </p>
                  <p className="text-base font-semibold text-amber-900">{summaryStats.window}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {latestTSH ? `Last record: ${new Date(latestTSH.timestamp).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>

              {/* Reference Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">📊 Understanding Your TSH Levels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 mt-1 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-gray-800">TSH &lt; {TSH_NORMAL_LOW} mIU/L</p>
                      <p className="text-gray-600">May indicate hyperthyroidism (overactive thyroid)</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-gray-800">TSH {TSH_NORMAL_LOW} - {TSH_NORMAL_HIGH} mIU/L</p>
                      <p className="text-gray-600">Normal range - healthy thyroid function</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 mt-1 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-gray-800">TSH &gt; {TSH_NORMAL_HIGH} mIU/L</p>
                      <p className="text-gray-600">May indicate hypothyroidism (underactive thyroid)</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Saved Reports Section */}
      <section className="mt-8">
        <SavedReports />
      </section>
    </>
  );
};

export default Dashboard;
