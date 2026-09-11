export const fetchOpenRouterFreeModels = async () => {
  try {
    const res = await fetch(
      'https://openrouter.ai/api/frontend/v1/models/find?active=true&fmt=cards&q=free'
    );
    const data = await res.json();
    // @ts-ignore
    return data.data.models.map((m) => ({
      label: m.name,
      value: m.slug,
    }));
  } catch (err) {
    console.log(err);
    return [];
  }
};
