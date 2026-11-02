Finding 4’s third op uses the old, invalid 43-character ID. With the requested bounded allocator, the new node gets a different valid ID, while that literal old ID still normalizes to the group ID. I plan to retain the exact sequence as a normalization check, then separately verify that removal using the generated valid ID deletes only the node. Does that match your intent, or do you want legacy overlong references handled differently?

Codex session ID: 01a19c8d-26ce-7401-b450-83789e723544
Resume in Codex: codex resume 01a19c8d-26ce-7401-b450-83789e723544
