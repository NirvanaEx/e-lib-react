import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

// pageSize is spliced straight into `.limit()` by every paginated service, so
// without a ceiling a single authenticated request (`?pageSize=100000000`)
// makes the API serialise a whole table. The cap is 1000 because that is the
// largest page the SPA legitimately asks for (the favourites list); the
// statistics DTOs already bound their own `limit` the same way.
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
