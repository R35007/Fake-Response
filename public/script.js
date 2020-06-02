function ResourceItem({ name, length }) {
  return `
  <li>
    <a href="${name}">${name}</a>
    <sup>${length ? `${length}x` : "object"}</sup>
  </li>
`;
}

function ResourceList({ db }) {
  const defaultRoutes = ["/db", "/routesList"].filter((r) => Object.keys(db).indexOf(r) < 0);
  return `
  <ul>
    ${[...Object.keys(db), ...defaultRoutes]
      .map((name) =>
        ResourceItem({
          name,
          length: Array.isArray(db[name]) && db[name].length,
        })
      )
      .join("")}
  </ul>
`;
}

function NoResources() {
  return `<p>No resources found</p>`;
}

function ResourcesBlock({ db }) {
  return `
  <div>
    <h1>Resources</h1>
    ${Object.keys(db).length ? ResourceList({ db }) : NoResources()}
  </div>
`;
}

window
  .fetch("db")
  .then((response) => response.json())
  .then((db) => (document.getElementById("resources").innerHTML = ResourcesBlock({ db })));
