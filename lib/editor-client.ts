/* eslint-disable @typescript-eslint/no-explicit-any */
/* Browser-side adapter for the private editor. Privileged Supabase credentials never enter this module. */
let editorSecret = "";
export function configureEditorClient(secret: string) {
  editorSecret = secret;
}
type Filter = { column: string; op: "eq" | "is"; value: unknown };
class EditorQuery implements PromiseLike<any> {
  private action = "select";
  private payload: any;
  private columns = "*";
  private filters: Filter[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private one = false;
  constructor(private resource: string) {}
  select(columns = "*") {
    this.columns = columns;
    return this;
  }
  insert(data: any) {
    this.action = "insert";
    this.payload = data;
    return this;
  }
  update(data: any) {
    this.action = "update";
    this.payload = data;
    return this;
  }
  upsert(data: any) {
    this.action = "upsert";
    this.payload = data;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push({ column, op: "is", value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }
  single() {
    this.one = true;
    return this.run();
  }
  then<TResult1 = any, TResult2 = never>(
    resolve?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.run().then(resolve, reject);
  }
  private async run() {
    try {
      const response = await fetch("/api/portfolio-editor", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-editor-secret": editorSecret,
        },
        body: JSON.stringify({
          resource: this.resource,
          action: this.action,
          data: this.payload,
          columns: this.columns,
          filters: this.filters,
          order: this.orderBy,
          single: this.one,
        }),
      });
      const result = (await response.json()) as { data?: unknown; error?: string };
      if (!response.ok)
        return {
          data: null,
          error: { message: result.error || "Editor request failed" },
        };
      return { data: result.data, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : "Editor request failed",
        },
      };
    }
  }
}
export const editorClient = {
  from(resource: string) {
    return new EditorQuery(resource);
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(
          path: string,
          file: File,
          _options?: { contentType?: string },
        ) {
          void _options;
          const form = new FormData();
          form.set("bucket", bucket);
          form.set("path", path);
          form.set("file", file);
          const response = await fetch("/api/portfolio-editor", {
            method: "POST",
            headers: { "x-editor-secret": editorSecret },
            body: form,
          });
          const result = (await response.json()) as { data?: unknown; error?: string };
          return response.ok
            ? { data: result.data, error: null }
            : {
                data: null,
                error: { message: result.error || "Upload failed" },
              };
        },
        getPublicUrl(path: string) {
          const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
          return {
            data: {
              publicUrl: `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`,
            },
          };
        },
      };
    },
  },
};
