#!/usr/bin/env node
import { request } from "node:https";
import { fileURLToPath } from "node:url";

export const required = [
  "NAMECHEAP_API_USER",
  "NAMECHEAP_API_KEY",
  "NAMECHEAP_USERNAME",
  "NAMECHEAP_CLIENT_IP",
  "NAMECHEAP_SLD",
  "NAMECHEAP_TLD",
  "DEPLOY_SERVER_IP",
];

const DEFAULT_HOST = "zombie-chosun";
const DEFAULT_TTL = "300";

function readEnv(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readCommonParams(command) {
  return new URLSearchParams({
    ApiUser: readEnv("NAMECHEAP_API_USER"),
    ApiKey: readEnv("NAMECHEAP_API_KEY"),
    UserName: readEnv("NAMECHEAP_USERNAME"),
    ClientIp: readEnv("NAMECHEAP_CLIENT_IP"),
    Command: command,
    SLD: readEnv("NAMECHEAP_SLD"),
    TLD: readEnv("NAMECHEAP_TLD"),
  });
}

function targetHost() {
  return process.env.NAMECHEAP_HOST?.trim() || DEFAULT_HOST;
}

function decodeXml(value) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttributes(rawAttributes) {
  const attributes = {};
  const pattern = /([A-Za-z0-9_:-]+)="([^"]*)"/g;
  let match = pattern.exec(rawAttributes);
  while (match !== null) {
    const [, key, value] = match;
    if (key !== undefined && value !== undefined) {
      attributes[key] = decodeXml(value);
    }
    match = pattern.exec(rawAttributes);
  }
  return attributes;
}

export function parseHostRecords(xml) {
  const hosts = [];
  const pattern = /<host\b([^>]*)\/?>/gi;
  let match = pattern.exec(xml);
  while (match !== null) {
    const attributes = parseAttributes(match[1] ?? "");
    if (
      typeof attributes.Name === "string" &&
      typeof attributes.Type === "string" &&
      typeof attributes.Address === "string"
    ) {
      hosts.push({
        name: attributes.Name,
        type: attributes.Type,
        address: attributes.Address,
        mxPref: typeof attributes.MXPref === "string" ? attributes.MXPref : undefined,
        ttl: typeof attributes.TTL === "string" ? attributes.TTL : DEFAULT_TTL,
      });
    }
    match = pattern.exec(xml);
  }
  return hosts;
}

function apiErrors(xml) {
  const errors = [];
  const pattern = /<Error\b[^>]*>([\s\S]*?)<\/Error>/gi;
  let match = pattern.exec(xml);
  while (match !== null) {
    errors.push(decodeXml((match[1] ?? "").trim()));
    match = pattern.exec(xml);
  }
  return errors;
}

export function assertNamecheapSuccess(xml, resultTag) {
  const status = xml.match(/<ApiResponse\b[^>]*\bStatus="([^"]+)"/i)?.[1];
  if (status !== "OK") {
    const errors = apiErrors(xml);
    throw new Error(
      `Namecheap API failed: ${errors.length > 0 ? errors.join("; ") : "unknown error"}`,
    );
  }

  if (resultTag !== undefined) {
    const resultPattern = new RegExp(`<${resultTag}\\b([^>]*)`, "i");
    const resultAttributes = parseAttributes(xml.match(resultPattern)?.[1] ?? "");
    if (resultAttributes.IsSuccess !== "true") {
      throw new Error(`Namecheap ${resultTag} did not report IsSuccess=true`);
    }
  }
}

function addHostParams(params, index, host) {
  params.set(`HostName${index}`, host.name);
  params.set(`RecordType${index}`, host.type);
  params.set(`Address${index}`, host.address);
  params.set(`TTL${index}`, host.ttl ?? DEFAULT_TTL);
  if (host.mxPref !== undefined && host.mxPref !== "") {
    params.set(`MXPref${index}`, host.mxPref);
  }
}

export function buildSetHostsParams(existingHosts, serverIp, hostName = targetHost()) {
  const params = readCommonParams("namecheap.domains.dns.setHosts");
  const preservedHosts = existingHosts.filter(
    (host) => !(host.name === hostName && host.type === "A"),
  );
  const nextHosts = [
    ...preservedHosts,
    {
      name: hostName,
      type: "A",
      address: serverIp,
      ttl: DEFAULT_TTL,
    },
  ];

  nextHosts.forEach((host, index) => {
    addHostParams(params, index + 1, host);
  });
  return params;
}

function postNamecheap(body) {
  const endpoint = new URL(
    process.env.NAMECHEAP_API_ENDPOINT ?? "https://api.namecheap.com/xml.response",
  );
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: endpoint.hostname,
        method: "POST",
        path: `${endpoint.pathname}${endpoint.search}`,
        port: endpoint.port === "" ? undefined : Number(endpoint.port),
        protocol: endpoint.protocol,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callNamecheap(params, resultTag) {
  const response = await postNamecheap(params.toString());
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Namecheap HTTP request failed with status ${response.statusCode}`);
  }
  assertNamecheapSuccess(response.body, resultTag);
  return response.body;
}

export async function upsertHost() {
  const getHostsXml = await callNamecheap(readCommonParams("namecheap.domains.dns.getHosts"));
  const existingHosts = parseHostRecords(getHostsXml);
  const hostName = targetHost();
  const serverIp = readEnv("DEPLOY_SERVER_IP");
  const setHostsXml = await callNamecheap(
    buildSetHostsParams(existingHosts, serverIp, hostName),
    "DomainDNSSetHostsResult",
  );
  return {
    target: `${hostName}.${readEnv("NAMECHEAP_SLD")}.${readEnv("NAMECHEAP_TLD")}`,
    hostName,
    serverIp,
    preservedHostCount: existingHosts.length,
    responseBytes: setHostsXml.length,
  };
}

async function main() {
  const missing = required.filter((name) => !process.env[name]);
  if (process.argv.includes("--check")) {
    console.log(
      JSON.stringify(
        {
          ok: missing.length === 0,
          target: `${targetHost()}.${process.env.NAMECHEAP_SLD ?? "hyeon"}.${
            process.env.NAMECHEAP_TLD ?? "space"
          }`,
          missing,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const result = await upsertHost();
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  });
}
