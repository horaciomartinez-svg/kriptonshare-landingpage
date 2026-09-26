/**
 * KRIPTONSHARE — Cloudflare Function
 * GET /api/analytics?days=7
 *
 * Proxy seguro hacia la API GraphQL de Cloudflare Web Analytics.
 * Requiere las variables de entorno:
 *   CF_API_TOKEN, CF_ACCOUNT_ID, CF_SITE_TAG
 */

export async function onRequestGet(context) {
    const { env, request } = context;

    // 1. Validación de variables de entorno de seguridad
    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) {
        return new Response(JSON.stringify({ error: "Missing Cloudflare API credentials in environment variables." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 2. Configuración de fechas dinámicas
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days")) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // 3. Consulta GraphQL optimizada para Web Analytics
    const query = `
      query GetAnalytics($accountTag: String, $siteTag: String, $start: String, $end: String) {
        viewer {
          accounts(filter: {accountTag: $accountTag}) {
            rumPageloadEventsAdaptiveGroups(
              limit: 5000,
              filter: {
                datetime_geq: $start,
                datetime_leq: $end,
                siteTag: $siteTag
              },
              orderBy: [datetime_ASC]
            ) {
              count
              dimensions {
                datetimeHour
              }
            }
          }
        }
      }
    `;

    const variables = {
        accountTag: env.CF_ACCOUNT_ID,
        siteTag: env.CF_SITE_TAG,
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };

    try {
        // 4. Petición autenticada a Cloudflare GraphQL
        const cfResponse = await fetch("https://api.cloudflare.com/client/v4/graphql", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query, variables })
        });

        if (!cfResponse.ok) {
            throw new Error(`Cloudflare API responded with status ${cfResponse.status}`);
        }

        const data = await cfResponse.json();

        // 5. Extracción y normalización de datos para el Frontend (Chart.js)
        const rawSeries = data?.data?.viewer?.accounts[0]?.rumPageloadEventsAdaptiveGroups || [];
        const formattedSeries = rawSeries.map(item => ({
            timestamp: item.dimensions.datetimeHour,
            visits: item.count
        }));

        return new Response(JSON.stringify({
            status: "success",
            period: `${days} days`,
            data: formattedSeries
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "max-age=300" // Caché en el Edge por 5 minutos
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 502,
            headers: { "Content-Type": "application/json" }
        });
    }
}
