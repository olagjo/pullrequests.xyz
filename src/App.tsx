import { Link, Route, Switch } from "wouter";
import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import { AllData, api, getPullrequestsViaRepository, getPullRequestsViaAuthor, PullRequest } from "./api";
import { TokenScreen } from "./TokenScreen";
import { Spinner } from "./Spinner";
import { PullRequestBrowser } from "./PullRequestBrowser";
import { Settings } from "./Settings";
import { cacheInLocalStore } from "./utils";

function App() {
  const [data, _setData] = useState<AllData | null>(null);
  const [token, setToken] = useState(localStorage.getItem("pullrequests.xyz_token") || "");

  const setData = (data: AllData | null) => {
    _setData(data);
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    (async () => {
      _setData(null);

      const [user, prsViaRepositories, ownPrs] = await Promise.all([
        api(
          `
          query User {
            viewer {
                name
                login
                avatarUrl
            }
          }
      `,
          {},
          token
        ).then((r) => r.json()),
        cacheInLocalStore(() => getPullrequestsViaRepository(token), "cache_prarepo"),
        cacheInLocalStore(() => getPullRequestsViaAuthor(token), "cache_praauthor"),
      ]);
      const prsByOwner: { [owner: string]: PullRequest[] } = {};
      const seen = new Set();
      for (const pr of ownPrs.concat(prsViaRepositories)) {
        if (seen.has(pr.id)) {
          continue;
        }
        seen.add(pr.id);
        const owner = pr.repository.owner.login;
        prsByOwner[owner] = prsByOwner[owner] || [];
        prsByOwner[owner].push(pr);
      }

      const groups = Object.entries(prsByOwner).map(([name, prs]) => ({ name, prs }));

      groups.forEach((group) => {
        group.prs.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      });
      groups.sort((a, b) => (a.name > b.name ? 1 : -1));

      console.log("le user", user);
      const dataToSet = {
        user: user.data.viewer,
        groups,
      };
      setData(dataToSet);
    })();
  }, [token]);

  if (!token) {
    return (
      <TokenScreen
        token={token}
        onUpdate={(newToken) => {
          setToken(newToken);
          localStorage.setItem("pullrequests.xyz_token", newToken);
        }}
      />
    );
  }

  if (!data) {
    return (
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
        className="flex items-center justify-center"
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 h-16 navbar-shadow dark:navbar-shadow">
        <div className="h-16 px-4 mx-auto container flex items-center">
          <a href="/" className="flex items-center">
            <img src={logo} className="w-8 h-8 mr-3" />
            <div className="font-bold">Pullrequests</div>
            <div className="font-thin">.xyz</div>
          </a>
          <div className="flex-1" />
          <div className="mr-8">
            <Link to="/settings">Settings</Link>
          </div>
          <div className="mr-5 hidden sm:block">{data.user.name}</div>
          <div className="mr-3 w-8 h-8 flex-shrink-0 self-center">
            <img
              src={data.user.avatarUrl}
              className="w-8 h-8 rounded-full shadow bg-gray-100 dark:bg-gray-500 dark:bg-opacity-10"
            />
          </div>
        </div>
      </div>
      <Switch>
        <Route path="/settings">{() => <Settings allData={data} />}</Route>
        <Route path="/:owner">{() => <PullRequestBrowser allData={data} />}</Route>
        <Route path="">{() => <PullRequestBrowser allData={data} />}</Route>
      </Switch>
    </div>
  );
}

export default App;
