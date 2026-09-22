export const fetchOpenRouterFreeModels = async () => {
  try {
    const res = await fetch(
      'https://openrouter.ai/api/frontend/v1/models/find?active=true&fmt=cards&q=free'
    );
    const data = (await res.json()) as {
      data?: { models?: { name?: string; slug?: string }[] };
    };
    return (data.data?.models ?? []).flatMap((model) =>
      model.name && model.slug
        ? [{ label: model.name, value: model.slug }]
        : []
    );
  } catch (err) {
    console.log(err);
    return [];
  }
};
