import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JiraServerApiService } from "../jira-server-api.js";

describe("JiraServerApiService", () => {
  const baseUrl = "https://jira.example.com";
  const apiToken = "test-token";
  const email = "user@example.com";
  let service: JiraServerApiService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    service = new JiraServerApiService(baseUrl, email, apiToken, "bearer");
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("cleanIssue handles plain-text descriptions from Jira Server", () => {
    const result = (service as any).cleanIssue({
      id: "1",
      key: "TEST-1",
      fields: {
        summary: "Test issue",
        description: "As a user I need TEST-2 to be visible",
        status: { name: "Open" },
      },
    });

    expect(result.description).toBe("As a user I need TEST-2 to be visible");
    expect(result.relatedIssues).toContainEqual({
      key: "TEST-2",
      type: "mention",
      source: "description",
      commentId: undefined,
    });
  });

  test("addCommentToIssue sends plain text body to Jira Server", async () => {
    const issueIdOrKey = "TEST-1";
    const commentBody = "This is a Jira Server comment.";

    const mockFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      expect(input.toString()).toBe(
        `${baseUrl}/rest/api/2/issue/${issueIdOrKey}/comment`
      );
      expect(init?.method).toBe("POST");

      const sentBody = JSON.parse(init?.body as string);
      expect(sentBody).toEqual({ body: commentBody });

      return new Response(
        JSON.stringify({
          id: "12345",
          author: { displayName: "Test User" },
          body: commentBody,
          created: "2026-03-13T10:00:00.000Z",
          updated: "2026-03-13T10:00:00.000Z",
        }),
        { status: 201 }
      );
    };
    mockFetch.preconnect = async () => {};
    global.fetch = mockFetch;

    const result = await service.addCommentToIssue(issueIdOrKey, commentBody);

    expect(result).toEqual({
      id: "12345",
      author: "Test User",
      created: "2026-03-13T10:00:00.000Z",
      updated: "2026-03-13T10:00:00.000Z",
      body: commentBody,
    });
  });
});
