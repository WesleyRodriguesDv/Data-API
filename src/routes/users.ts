
import axios from "axios";
import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";

let users: any[] = [];

export const setUsers = (data: any[]) => {
  users = data;
};

//Carrega os arquivos com os usuários
export async function usersRoutes(app: FastifyInstance) {
  app.post("/users", async (_, reply) => {
    try {
      const filePath = path.join("C:", "usuarios.json");
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);

      if (!Array.isArray(parsed)) {
        return reply
          .status(400)
          .send({ error: "O arquivo deve conter um array de usuários." });
      }

      setUsers(parsed);
      return reply
        .status(201)
        .send({ message: `${parsed.length} usuários carregados.` });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: "Erro ao carregar o arquivo." });
    }
  });

  //Filtro: score >= 900 e active = true
  app.get("/superusers", async (_, reply) => {
    const start = process.hrtime();

    const filtered = users.filter(
      (user) => user.score >= 900 && user.active === true
    );

    const [sec, nano] = process.hrtime(start);
    const processingTimeMs = (sec * 1000 + nano / 1e6).toFixed(2);

    return reply.send({
      processingTimeMs: `${processingTimeMs} ms`,
      total: filtered.length,
      data: filtered,
    });
  });

  //Agrupa os superusuários por país.
 //Retorna os 5 países com maior número de superusuários.
  app.get("/top-countries", async (_, reply) => {
    const superusers = users.filter(
      (user) => user.score >= 900 && user.active === true
    );

    const countryCount: Record<string, number> = {};
    for (const user of superusers) {
      const country = user.country;
      countryCount[country] = (countryCount[country] || 0) + 1;
    }

    const topCountries = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    return reply.send({
      totalSuperusers: superusers.length,
      topCountries,
    });
  });

  //Agrupa por team.name.
  //Retorna: total de membros, líderes, projetos concluídos e % de membros ativos.

  app.get('/team-insights', async (_, reply) => {
  const teams: Record<string, {
    totalMembers: number;
    leaders: number;
    completedProjects: number;
    activeMembers: number;
  }> = {};

  for (const user of users) {
    const teamName = user.team?.name;
    if (!teamName) continue;

    if (!teams[teamName]) {
      teams[teamName] = {
        totalMembers: 0,
        leaders: 0,
        completedProjects: 0,
        activeMembers: 0,
      };
    }

    const team = teams[teamName];
    team.totalMembers += 1;
    if (user.team.leader) team.leaders += 1;
    if (user.active) team.activeMembers += 1;

    for (const project of user.team.projects || []) {
      if (project.completed) team.completedProjects += 1;
    }
  }

  const insights = Object.entries(teams).map(([name, data]) => ({
    team: name,
    totalMembers: data.totalMembers,
    leaders: data.leaders,
    completedProjects: data.completedProjects,
    activePercentage: Number(((data.activeMembers / data.totalMembers) * 100).toFixed(2)),
  }));

  return reply.send(insights);
});


//Conta quantos logins aconteceram por data.
//Query param opcional: ?min=3000 para filtrar dias com pelo menos 3.000 logins.
app.get('/active-users-per-day', async (request, reply) => {
  const minLogins = Number((request.query as any).min) || 0;

  const loginCounts: Record<string, number> = {};

  for (const user of users) {
    for (const log of user.logs || []) {
      if (log.action === 'login') {
        loginCounts[log.date] = (loginCounts[log.date] || 0) + 1;
      }
    }
  }

  const result = Object.entries(loginCounts)
    .filter(([, count]) => count >= minLogins)
    .sort((a, b) => a[0].localeCompare(b[0])) // ordena por data crescente
    .map(([date, count]) => ({ date, logins: count }));

  return reply.send(result);
});



app.get('/evaluation', async (_, reply) => {
  const baseURL = 'http://localhost:3000';

  const endpoints = [
    { name: 'POST /users', method: 'post', url: '/users', data: [] },
    { name: 'GET /superusers', method: 'get', url: '/superusers' },
    { name: 'GET /top-countries', method: 'get', url: '/top-countries' },
    { name: 'GET /team-insights', method: 'get', url: '/team-insights' },
    { name: 'GET /active-users-per-day', method: 'get', url: '/active-users-per-day' }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const start = performance.now();
    try {
      const response = await axios({
        method: endpoint.method,
        url: baseURL + endpoint.url,
        data: endpoint.data
      });

      const duration = performance.now() - start;
      const isJSON = typeof response.data === 'object';

      results.push({
        endpoint: endpoint.name,
        status: response.status,
        isJSON,
        timeMs: duration.toFixed(2),
        success: response.status === 200 && isJSON
      });
    } catch (err) {
      const duration = performance.now() - start;
      results.push({
        endpoint: endpoint.name,
        status: (err as any)?.response?.status || 500,
        isJSON: false,
        timeMs: duration.toFixed(2),
        success: false,
        error: (err as any)?.message
      });
    }
  }

  return reply.send({
    evaluatedAt: new Date().toISOString(),
    results,
    score: `${results.filter(r => r.success).length} / ${results.length}`
  });
});


}
