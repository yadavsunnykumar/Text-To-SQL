export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

export interface ForeignKeyInfo {
  columns: string[];
  referred_table: string;
  referred_columns: string[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  foreign_keys: ForeignKeyInfo[];
  row_count: number | null;
}

export interface DatabaseSchema {
  dialect: string;
  tables: TableInfo[];
}
