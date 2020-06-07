function filterRoutes() {
  let input, filter, ul, li, a, i, txtValue;
  input = document.getElementById("search");
  filter = input.value.toUpperCase();
  ul = document.getElementById("resources-list");
  li = ul.getElementsByTagName("li");
  let isEmpty = true;
  for (i = 0; i < li.length; i++) {
    a = li[i].getElementsByTagName("a")[0];
    txtValue = a.textContent || a.innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "block";
      isEmpty = false;
    } else {
      li[i].style.display = "none";
    }
  }
  if (isEmpty) {
    NoResources();
  } else {
    FoundResources();
  }
}

function setIframe(route) {
  document.getElementById("loader").style.display = "block";
  document.getElementById("resource-iframe").src = route;
}

function ResourceItem(name) {
  return `
  <li>
    <a onclick="setIframe('${name}')">${name}</a>
  </li>
`;
}

function ResourceList({ db }) {
  const defaultRoutes = ["/db", "/routesList"].filter((r) => Object.keys(db).indexOf(r) < 0);
  document.getElementById("resource-iframe").src = Object.keys(db)[0];
  return `
  <ul id="resources-list">
    ${[...Object.keys(db), ...defaultRoutes].map((name) => ResourceItem(name)).join("")}
  </ul>
`;
}

function NoResources() {
  document.getElementById("resources-list").style.display = "none";
  document.getElementById("iframe-wrapper").style.display = "none";
  document.getElementById("noresources").style.display = "block";
  return "";
}

function FoundResources() {
  document.getElementById("resources-list").style.display = "block";
  document.getElementById("iframe-wrapper").style.display = "block";
  document.getElementById("noresources").style.display = "none";
  return "";
}

function ResourcesBlock({ db }) {
  return Object.keys(db).length ? ResourceList({ db }) : NoResources();
}

window
  .fetch("db")
  .then((response) => response.json())
  .then((db) => (document.getElementById("resources-list").innerHTML += ResourcesBlock({ db })));
