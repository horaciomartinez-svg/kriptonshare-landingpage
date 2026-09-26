/* KRIPTONSHARE — admin-analytics.js */

let chart = null;

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

  if (els.total) els.total.textContent = fmtNumber(total);
  if (els.max) els.max.textContent = fmtNumber(max);

  if (els.trend) {
    const sign = trend > 0 ? '+' : '';
    els.trend.textContent = `${sign}${trend.toFixed(1)}%`;
    els.trend.classList.toggle('text-success', trend >= 0);
    els.trend.classList.toggle('text-red-500', trend < 0);
  }
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
    const response = await fetch(`/api/analytics?days=${days}`);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : (payload.data || []);

    const labels = data.map((point) => formatLabel(point.timestamp));
    const dataPoints = data.map((point) => Number(point.visits) || 0);

    updateStats(data);
    renderChart(labels, dataPoints);
  } catch (error) {
    console.error('fetchAnalytics:', error);
    resetStats();
    showError('No se pudieron cargar los datos de analítica. Inténtalo de nuevo más tarde.');
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

  if (els.dateRange) {
    els.dateRange.addEventListener('change', (event) => {
      fetchAnalytics(event.target.value);
    });
  }

  fetchAnalytics(7);
});
