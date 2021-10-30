import { CheckIcon, DotFillIcon, GitPullRequestIcon, XIcon } from "@primer/octicons-react";
import { useEffect, useRef, useState } from "react";
import { AllData, api, getAllPullrequestGroups, PullRequest } from "./api";
import { Spinner } from "./Spinner";
import { Tooltip } from "@mui/material";
import { TokenScreen } from "./TokenScreen";
import { useLocalStorage } from "./utils";

const shortcutLetters = "asdfqwertzxcvbnmyuiopASDFQWERTZXCVBNMYUIOP";

export const PullRequestBrowser: React.FC<{ allData: AllData }> = ({ allData }) => {
  const cursor = useRef(0);
  const cursorVimStateBuffer = useRef("");
  const [showWIPs, setShowWIPs] = useState(false);
  const [, setRefresher] = useState(true);
  const [excludes] = useLocalStorage<string[]>("pullrequests.xyz_settings_excludes", []);

  let filteredData = useRef<{ groups: { name: string; prs: PullRequest[] }[] } | null>(null);
  if (allData) {
    filteredData.current = {
      groups: allData.groups.map((obj) => ({ ...obj })),
    };
    filteredData.current.groups.forEach((obj) => {
      obj.prs = obj.prs.filter((pr) => {
        const isWip = pr.isDraft || pr.title.trim().toLowerCase().replaceAll(/\[|\]/g, "").startsWith("wip");
        if (isWip && !showWIPs) {
          return false;
        }
        const repoPath = `${obj.name}/${pr.repo.name}`;
        for (const exclude of excludes) {
          const regex = new RegExp(exclude.replaceAll("*", ".*"), "gi");
          if (regex.test(repoPath)) {
            return false;
          }
        }
        return true;
      });
    });
    filteredData.current.groups = filteredData.current.groups.filter((obj) => obj.prs.length > 0);
  }

  const setCursor = (fn: (cursor: number) => number) => {
    cursor.current = fn(cursor.current);
    if (filteredData.current) {
      const newOwner = filteredData.current.groups[cursor.current].name;
      setSelectedOwner(newOwner);
    }
    setRefresher((old) => !old);
  };

  useEffect(() => {
    const onKeypress = (e: KeyboardEvent) => {
      e.preventDefault();
      const index = shortcutLetters.indexOf(e.key);
      if (index !== -1) {
        const selected = filteredData.current?.groups[cursor.current].prs[index]!;
        window.open(selected.url, "_blank");
        cursorVimStateBuffer.current = "";
      } else if (e.key === "j") {
        window.scrollBy({
          left: 0,
          top: 96,
        });
        cursorVimStateBuffer.current = "";
      } else if (e.key === "k") {
        window.scrollBy({
          left: 0,
          top: -96,
        });
        cursorVimStateBuffer.current = "";
      } else if (e.key === "h") {
        setCursor((old) => Math.max(0, old - 1));
        cursorVimStateBuffer.current = "";
      } else if (e.key === "l") {
        setCursor((old) => Math.min((filteredData.current?.groups.length ?? 1) - 1, old + 1));
        cursorVimStateBuffer.current = "";
      } else if (e.key === "g") {
        cursorVimStateBuffer.current += "g";
      } else if (e.key === "G") {
        cursorVimStateBuffer.current = "";
        window.scrollTo({
          left: 0,
          top: 9999999999,
        });
      }
      if (cursorVimStateBuffer.current == "gg") {
        cursorVimStateBuffer.current = "";
        window.scrollTo({
          left: 0,
          top: 0,
        });
      }
    };
    window.addEventListener("keypress", onKeypress);
    return () => {
      window.removeEventListener("keypress", onKeypress);
    };
  }, []);

  useEffect(() => {
    const pathname = window.location.pathname.slice(1);
    if (allData && pathname) {
      const index = allData.groups.findIndex((group) => group.name === pathname);
      if (index !== -1) {
        setTimeout(() => setCursor(() => index));
      }
    }
    if (allData && !pathname) {
      setTimeout(() => setCursor(() => 0));
    }
  }, [allData]);

  const selectedOwner = window.location.pathname.slice(1);
  const setSelectedOwner = (owner: string) => {
    window.history.replaceState(undefined, "", `/${owner}`);
  };

  const selectedPrs = filteredData.current?.groups.find((obj) => obj.name === selectedOwner);

  return (
    <>
      <div className="container px-3 mx-auto">
        <div className="m-3 p-3">
          <select
            className="block sm:hidden outline-none relative py-2 px-5 rounded-full divide-opacity-0 mr-3 border dark:border-transparent dark:bg-gray-800 bg-white dark:bg-gray-200 text-black font-bold"
            value={cursor.current}
            onChange={(e) => setCursor(() => +e.target.value)}
          >
            {filteredData.current?.groups.map(({ name }, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div
          className="hidden sm:flex flex-wrap gap-y-3 my-3 bg-gray-100 dark:bg-black dark:bg-opacity-30 py-3 px-3 text-gray-700 dark:text-gray-400 mb-6"
          style={{ borderRadius: 33 }}
        >
          {filteredData.current?.groups.map(({ name, prs }, i) => {
            const count = prs.filter((pr) => pr.settings.shouldHighlight).length;
            return (
              <button
                className={`outline-none relative py-2 px-5 rounded-full divide-opacity-0 mr-3 border dark:border-transparent dark:bg-gray-800 ${
                  name === selectedOwner ? "bg-white dark:bg-gray-200 text-black font-bold" : ""
                }`}
                key={name}
                onClick={(e) => {
                  e.preventDefault();
                  setCursor(() => i);
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {name}
                </div>
                <div
                  style={{ position: "absolute", right: -8, top: -4 }}
                  className={`flex items-center justify-center rounded-full w-6 h-6 dark:text-black ${
                    count > 0 ? "bg-yellow-200 dark:bg-yellow-300 font-bold" : "bg-gray-200"
                  } text-sm`}
                >
                  {count || prs.length}
                </div>
                <div style={{ visibility: "hidden" }} className="font-bold">
                  {name}
                </div>
              </button>
            );
          })}
        </div>

        {/*
        <label className="flex items-center my-3">
          <input type="checkbox" checked={showWIPs} onChange={(e) => setShowWIPs(e.target.checked)} className="mr-3" />
          <div>Show WIPs</div>
        </label>
        */}

        <div className="divide-y dark:divide-gray-800 rounded-3xl overflow-hidden mb-12">
          {selectedPrs?.prs.map((pr, i) => {
            return (
              <div
                key={pr.id}
                className={`h-16 px-4 flex ${pr.settings.isWip ? "bg-gray-200 font-thin" : ""} ${
                  pr.settings.shouldHighlight ? "bg-yellow-100 dark:bg-yellow-500 dark:bg-opacity-20" : ""
                } 
                ${i === 0 ? "rounded-t-3xl" : ""}
                ${i === selectedPrs?.prs.length - 1 ? "rounded-b-3xl" : ""}
                `}
              >
                <div className="self-center w-32 flex-shrink-0 font-thin text-right whitespace-nowrap overflow-hidden overflow-ellipsis">
                  <a href={`https://github.com/${selectedOwner}/${pr.repo.name}`} target="_blank">
                    {pr.repo.name}
                  </a>
                </div>
                <div className="flex items-center self-center justify-center flex-shrink-0 w-12 ml-3 mr-3">
                  {pr.commits.nodes[0].commit.statusCheckRollup?.state === "PENDING" && (
                    <Tooltip title="Pending" arrow>
                      <div>
                        <DotFillIcon className={!pr.settings.isWip ? "text-yellow-500" : "text-gray-500"} />
                      </div>
                    </Tooltip>
                  )}
                  {pr.commits.nodes[0].commit.statusCheckRollup?.state === "FAILURE" && (
                    <Tooltip title="Failure" arrow>
                      <div>
                        <XIcon className={!pr.settings.isWip ? "text-red-500" : "text-gray-500"} />
                      </div>
                    </Tooltip>
                  )}
                  {pr.commits.nodes[0].commit.statusCheckRollup?.state === "SUCCESS" && (
                    <Tooltip title="Success" arrow>
                      <div>
                        <CheckIcon className={!pr.settings.isWip ? "text-green-500" : "text-gray-500"} />
                      </div>
                    </Tooltip>
                  )}
                  {!pr.commits.nodes[0].commit.statusCheckRollup?.state && (
                    <div className="font-thin text-gray-500">—</div>
                  )}
                </div>
                <Tooltip title={pr.author.login} arrow>
                  <div className="mr-5 w-6 h-6 flex-shrink-0 self-center select-none">
                    <img
                      src={pr.author.avatarUrl}
                      className="w-6 h-6 rounded-full shadow bg-gray-100 dark:bg-gray-500 dark:bg-opacity-10"
                    />
                  </div>
                </Tooltip>
                <div className="flex items-center ml-2 flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
                  <div className="flex items-center">
                    <kbd
                      className={`select-none w-6 h-6 flex items-center justify-center mr-6 self-center text-gray-510 dark:text-gray-400 text-sm font-thin  bg-gray-100 shadow rounded ${
                        pr.settings.shouldHighlight ? "dark:bg-gray-900" : "dark:bg-gray-800"
                      }`}
                    >
                      {shortcutLetters[i]}
                    </kbd>
                    <a
                      href={pr.url}
                      target="_blank"
                      className={`overflow-ellipsis ${pr.settings.shouldHighlight ? "dark:text-yellow-400" : ""}`}
                    >
                      {pr.title}
                    </a>
                    {pr.labels.nodes.map((label) => (
                      <div
                        key={label.name}
                        className="ml-3 text-xs rounded-full px-3 py-1 bg-gray-200 dark:bg-gray-700"
                      >
                        {label.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center flex-shrink-0">
                  {pr.settings.needsRebase && (
                    <div className="text-gray-500 ml-3 font-normal whitespace-nowrap dark:text-gray-100 dark:text-opacity-50">
                      <span className="hidden lg:inline">Needs </span>rebase
                      <GitPullRequestIcon className="ml-3" />
                    </div>
                  )}
                </div>

                <div className="w-24 lg:w-48 ml-3 flex justify-end items-center flex-shrink-0">
                  {pr.reviewDecision === "APPROVED" && (
                    <div className="rounded-full border-2 border-opacity-0 px-5 py-1 text-gray-500">Approved</div>
                  )}
                  {pr.assignees.nodes.length === 0 &&
                    pr.settings.needsReview &&
                    (pr.settings.isAuthor ? (
                      <div
                        className={`rounded-full border-2 border-opacity-0 px-5 py-1 text-gray-700 text-opacity-75 ${
                          pr.settings.shouldHighlight
                            ? "dark:text-yellow-100 dark:text-opacity-55"
                            : "dark:text-gray-100 dark:text-opacity-50"
                        }`}
                      >
                        <span className="hidden lg:inline">Needs </span>review
                      </div>
                    ) : (
                      <div className="rounded-full border-2 px-5 py-1 border-yellow-700 text-yellow-700 dark:border-yellow-400 dark:text-yellow-400">
                        <span className="hidden lg:inline">Needs </span>review
                      </div>
                    ))}
                  {pr.assignees.nodes.map((assignee) => (
                    <Tooltip key={assignee.id} title={assignee.login} arrow>
                      <div key={assignee.id} className="select-none ml-3 w-8 h-8 flex-shrink-0">
                        <img
                          src={assignee.avatarUrl}
                          className="w-8 h-8 rounded-full shadow bg-gray-100 dark:bg-gray-500 dark:bg-opacity-10"
                        />
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};