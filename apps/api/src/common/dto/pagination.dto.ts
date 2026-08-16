import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

// Верхняя граница страницы: без неё любой вошедший может запросить
// pageSize=1000000 и вытянуть таблицу целиком одним запросом. 1000 — самый
// большой размер, который просит сам фронт (список избранного).
export const MAX_PAGE_SIZE = 1000;

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = 20;
}
