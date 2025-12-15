import { useRef, useState } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import {
  DownloadIcon,
  GitCommitIcon,
  MarkGithubIcon,
  TrophyIcon,
} from "@primer/octicons-react";
import type { GetWrappedType } from "@apps/api";
import { hc, type InferResponseType } from "hono/client";
import { toPng } from "html-to-image";

const URL = import.meta.env.PROD
  ? "https://api.rezha-bahari.workers.dev"
  : "http://localhost:8787";

const client = hc<GetWrappedType>(URL);

function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const $get = client.wrapped[":username"].$get;
  type ResType = InferResponseType<typeof $get, 200>;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResType>();
  const [userName, setUserName] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  const handleGetWrapped = async () => {
    if (!userName) return;

    setLoading(true);

    try {
      const res = await client.wrapped[":username"].$get({
        param: {
          username: userName,
        },
      });

      const data = await res.json();

      if ("error" in data) {
        console.error("Error fetching wrapped data:", data.error);
        return;
      }

      setData(data);
    } catch (error) {
      console.error("Error when fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportImage = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `github-wrapped-${userName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error exporting image:", error);
    }
  };

  return (
    <div className="p-8 bg-linear-to-tr from-slate-900 via-cyan-900 to-green-800 min-h-screen flex justify-center">
      <a
        href="https://github.com/rezha4/github-wrapped"
        target="_blank"
        className="absolute right-0 top-0 p-2 hover:text-gray-900"
      >
        <MarkGithubIcon className="size-5 sm:size-10" />
      </a>

      {!data && (
        <div className="mt-36">
          <h1 className="text-2xl md:text-4xl text-center font-bold text-white mb-4">
            GitHub Wrapped 2025
          </h1>

          <div className="flex flex-col">
            <label
              className="text-white font-medium"
              htmlFor="username"
            >
              GitHub Username
            </label>
            <input
              id="username"
              className="w-full flex items-center justify-center gap-2 px-2 py-1 border-2 text-white rounded-lg font-medium"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleGetWrapped}
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 active:bg-black text-white rounded-lg font-medium hover:cursor-pointer"
          >
            {loading ? "Loading..." : "Get Wrapped"}
          </button>

          <p className="text-xs text-gray-400 mt-4">
            *we only took data that are publicly available via
            official GitHub API
          </p>
        </div>
      )}

      {data && (
        <div>
          <div
            ref={cardRef}
            className="rounded-xl max-[400px]:w-[300px] sm:w-[400px] bg-linear-to-t from-[#57D465] via-teal-800 to-black text-white py-8"
          >
            <h1 className="text-4xl font-bold text-center text-white">
              Github Wrapped 2025
            </h1>

            <div className="flex items-center justify-center gap-2 mt-4">
              <div>
                <img
                  className="size-14 rounded-full"
                  src={data.avatarUrl}
                />
              </div>
              <p>@{data.username}</p>
            </div>

            <ActivityCalendar
              data={data.contributionCalendar}
              theme={{
                light: ["hsl(0, 0%, 92%)", "rebeccapurple"],
                dark: ["#0D1117", "#57D465"],
              }}
              showWeekdayLabels
              style={{
                width: "350px",
              }}
              showTotalCount={false}
              showColorLegend={false}
            />

            <div className="px-8">
              <div className="pb-4 grid gap-2">
                <div className="bg-linear-to-t from-teal-900 to-emerald-900 text-white rounded-md flex items-center justify-center text-center gap-2">
                  <GitCommitIcon size={64} />
                  <p className="text-xl font-medium">
                    {data.totalContributions
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                    Total Commits
                  </p>
                </div>
              </div>

              <div className="pb-4 grid grid-cols-1 gap-2">
                <div className="bg-linear-to-r from-black h-20 rounded-md flex flex-col items-center justify-center gap-1">
                  <TrophyIcon size={24} />
                  <p className="font-medium">
                    {data.streak.longest} Days Longest Commit Streak
                  </p>
                </div>
              </div>

              {data.organizations.length > 0 && (
                <div>
                  <p className="mb-1">Contributed to</p>

                  <div
                    className={`pb-4 gap-2 grid ${
                      data.organizations.length === 1
                        ? "grid-cols-1"
                        : "grid-cols-3"
                    }`}
                  >
                    {data.organizations.map((org) => (
                      <div
                        onClick={() => {
                          setData((d) => {
                            if (!d) return d;
                            return {
                              ...d,
                              organizations: d.organizations.filter(
                                (o) => o.login !== org.login
                              ),
                            };
                          });
                        }}
                        title="click to remove"
                        className="hover:cursor-pointer h-20 bg-linear-to-l from-white via-slate-200 text-black rounded-md flex flex-col items-center justify-center gap-1"
                      >
                        <img
                          className="size-8 rounded-full"
                          src={org.avatarUrl}
                        />
                        <p className="truncate w-16 text-center font-medium">
                          {org.login}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-center mb-1">Top Languages</p>
                <div className="pb-4 grid grid-cols-3 gap-2 items-end">
                  <div
                    className="h-22 rounded-md flex flex-col items-center justify-center"
                    style={{
                      background: `linear-gradient(to top, ${data.topLanguages[1].color}, transparent)`,
                    }}
                  >
                    <p className="font-bold">#2</p>
                    <p className="font-medium">
                      {data.topLanguages[1].name}
                    </p>
                  </div>
                  <div
                    className={`h-24 rounded-md flex flex-col items-center justify-center`}
                    style={{
                      background: `linear-gradient(to top, ${data.topLanguages[0].color}, transparent)`,
                    }}
                  >
                    <p className="font-bold">#1</p>
                    <p className="font-medium">
                      {data.topLanguages[0].name}
                    </p>
                  </div>
                  <div
                    className="h-20 rounded-md flex flex-col items-center justify-center"
                    style={{
                      background: `linear-gradient(to top, ${data.topLanguages[2].color}, transparent)`,
                    }}
                  >
                    <p className="font-bold">#3</p>
                    <p className="font-medium">
                      {data.topLanguages[2].name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-100 text-xs text-center mt-4 -mb-4">
              create yours at github-wrappped.pages.dev
            </p>
          </div>

          <div>
            <p className="w-80 text-xs mt-2 px-4 text-gray-400">
              *tip: you can remove organizations in "Contributed to"
              section by clicking on them
            </p>
            <button
              onClick={handleExportImage}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-2 border-2 hover:bg-gray-900 active:bg-black text-white rounded-lg font-medium hover:cursor-pointer"
            >
              <DownloadIcon /> Download Image
            </button>
            <a
              href="https://github.com/rezha4/github-wrapped"
              target="_blank"
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-2 border-2 hover:bg-gray-900 active:bg-black text-white rounded-lg font-medium hover:cursor-pointer"
            >
              <MarkGithubIcon /> Contribute
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
