/* KRIPTONSHARE — admin-analytics.js */

let chart = null;
let chartContainerHTML = '';

const els = {};

const fmtNumber = (n) => new Intl.NumberFormat('es-ES').format(n);

function setLoading(isLoading) {
  if (!els.loading) return;
  els.loading.classList.toggle('hidden', !isLoading);
}

function showError(message) {
  if (!els.error) return;
  els.error.textContent = message;
  els.error.classList.remove('hidden');
}

function clearError() {
  if (!els.error) return;
  els.error.textContent = '';
  els.error.classList.add('hidden');
}

function resetStats() {
  if (els.total) els.total.textContent = '—';
  if (els.max) els.max.textContent = '—';
  if (els.trend) els.trend.textContent = '—';
}

function updateStats(data) {
  const total = data.reduce((sum, point) => sum + (Number(point.visits) || 0), 0);
  const max = data.reduce((acc, point) => Math.max(acc, Number(point.visits) || 0), 0);

  const half = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, half).reduce((sum, p) => sum + (Number(p.visits) || 0), 0);
  const secondHalf = data.slice(half).reduce((sum, p) => sum + (Number(p.visits) || 0), 0);
  const trend = firstHalf === 0 ? (secondHalf > 0 ? 100 : 0) : ((secondHalf - firstHalf) / firstHalf) * 100;

  if (els.total) {
    els.total.textContent = fmtNumber(total);
    els.total.classList.remove('text-red-500');
  }
  if (els.max) {
    els.max.textContent = fmtNumber(max);
    els.max.classList.remove('text-red-500');
  }

  if (els.trend) {
    const sign = trend > 0 ? '+' : '';
    els.trend.textContent = `${sign}${trend.toFixed(1)}%`;
    els.trend.classList.toggle('text-success', trend >= 0);
    els.trend.classList.toggle('text-red-500', trend < 0);
  }
}

function restoreChartContainer() {
  const container = document.getElementById('chartContainer');
  if (!container) return;
  if (!document.getElementById('analyticsChart')) {
    container.innerHTML = chartContainerHTML;
  }
  els.canvas = document.getElementById('analyticsChart');
}

function formatLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function renderChart(labels, dataPoints) {
  if (!els.canvas) return;

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = dataPoints;
    chart.update();
    return;
  }

  chart = new Chart(els.canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Visitas',
          data: dataPoints,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: '#2563EB'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(100, 116, 139, 0.15)' }
        }
      }
    }
  });
}

async function fetchAnalytics(days) {
  setLoading(true);
  clearError();

  try {
    console.log(`[Analytics] Iniciando fetch para ${days} días...`);
    const response = await fetch(`/api/analytics?days=${days}`);
    const data = await response.json();

    console.log("[Analytics] Payload crudo recibido del backend:", data);

    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP Error: ${response.status}`);
    }

    if (!data.data || data.data.length === 0) {
      console.warn("[Analytics] La API respondió correctamente pero el arreglo de datos está vacío (No hay tráfico RUM).");
    }

    const series = Array.isArray(data) ? data : (data.data || []);
    const labels = series.map((point) => formatLabel(point.timestamp));
    const dataPoints = series.map((point) => Number(point.visits) || 0);

    restoreChartContainer();
    updateStats(series);
    renderChart(labels, dataPoints);
  } catch (error) {
    console.error("[Analytics] Error crítico en la extracción de datos:", error);

    if (chart) {
      chart.destroy();
      chart = null;
    }

    resetStats();

    document.querySelectorAll('.stat-value').forEach(el => {
      el.textContent = "Error";
      el.classList.add('text-red-500');
    });

    const chartContainer = document.getElementById('chartContainer');
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-red-600 bg-red-50 p-6 rounded-lg border border-red-200">
            <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <h3 class="font-bold text-lg">Error de Comunicación con la API</h3>
            <code class="mt-2 text-sm bg-white p-2 rounded shadow-sm">${error.message}</code>
            <p class="mt-4 text-sm text-slate-500">Abre la consola del navegador (F12) para ver el payload completo.</p>
        </div>
      `;
    }

    showError('No se pudieron cargar los datos de analítica. Revisa la consola (F12) para más detalle.');
  } finally {
    setLoading(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  els.canvas = document.getElementById('analyticsChart');
  els.error = document.getElementById('errorState');
  els.loading = document.getElementById('loadingState');
  els.total = document.getElementById('statTotal');
  els.max = document.getElementById('statMax');
  els.trend = document.getElementById('statTrend');
  els.dateRange = document.getElementById('dateRange');

  const chartContainer = document.getElementById('chartContainer');
  if (chartContainer) chartContainerHTML = chartContainer.innerHTML;

  if (els.dateRange) {
    els.dateRange.addEventListener('change', (event) => {
      fetchAnalytics(event.target.value);
    });
  }

  fetchAnalytics(7);
});
