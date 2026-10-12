# Exports a snapshot of ROAD (ROCEEH Out of Africa Database) into data/raw/road/ via the roadDB package.
# Run by hand, once (not on every build):  Rscript scripts/fetch/road.R [--all-dates]
# Needs R >= 4.1 and install.packages("roadDB"). ROAD data is CC BY-SA 4.0: cite Kandel et al. 2023,
# PLOS ONE 18(8): e0289513, doi:10.1371/journal.pone.0289513, and the original publications per locality.
#
# Output (one CSV per table, list columns joined with " | "):
#   assemblages.csv           every assemblage: locality, coordinates, age range, cultural period, technocomplex
#   human-remains.csv         hominin finds (genus, species, element, ...) with their assemblage context
#   localities.csv            every locality with coordinates and age range
#   dates.csv                 absolute dates for assemblages with human remains (all assemblages with --all-dates)
#   publications.csv          references for localities with human remains
#   argument-values.csv       ROAD's vocabularies (cultural periods, technocomplexes, genera, species)
#   manifest.txt              when, which package version, row counts and any step that failed

suppressPackageStartupMessages(library(roadDB))

out <- "data/raw/road"
dir.create(out, recursive = TRUE, showWarnings = FALSE)
all_dates <- "--all-dates" %in% commandArgs(trailingOnly = TRUE)
log <- c(
  paste("retrieved:", format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")),
  paste("roadDB:", as.character(packageVersion("roadDB"))),
  "licence: CC BY-SA 4.0 (Kandel et al. 2023, doi:10.1371/journal.pone.0289513)"
)

flatten <- function(df) {
  for (col in names(df)) {
    if (is.list(df[[col]])) df[[col]] <- vapply(df[[col]], function(v) paste(unlist(v), collapse = " | "), "")
  }
  df
}

# Runs one export step; a failure is logged and the rest of the export carries on.
step <- function(name, expr) {
  message("-> ", name)
  result <- tryCatch(expr, error = function(e) {
    log <<- c(log, paste0(name, ": FAILED: ", conditionMessage(e)))
    message("   failed: ", conditionMessage(e))
    NULL
  })
  if (is.data.frame(result)) {
    write.csv(flatten(result), file.path(out, paste0(name, ".csv")), row.names = FALSE, na = "")
    log <<- c(log, paste0(name, ": ", nrow(result), " rows"))
    message("   ", nrow(result), " rows")
  }
  result
}

assemblages <- step("assemblages", road_get_assemblages())
step("localities", road_get_localities())

with_remains <- NULL
if (!is.null(assemblages) && "human_remains" %in% names(assemblages)) {
  flag <- tolower(as.character(assemblages$human_remains))
  with_remains <- assemblages[!is.na(flag) & flag %in% c("true", "t", "1", "yes"), ]
  log <- c(log, paste("assemblages with human remains:", nrow(with_remains)))
}

step("human-remains", if (is.null(with_remains)) road_get_human_remains() else road_get_human_remains(assemblages = with_remains))

date_set <- if (all_dates) assemblages else with_remains
if (!is.null(date_set)) step("dates", road_get_dates(assemblages = date_set))

if (!is.null(with_remains)) {
  step("publications", road_get_publications(localities = unique(with_remains$locality_id)))
}

step("argument-values", {
  args <- c("cultural_period", "technocomplex", "category", "locality_type", "human_genus", "human_species")
  do.call(rbind, lapply(args, function(a) {
    values <- unlist(road_list_argument_values(a))
    if (length(values) == 0) return(NULL)
    data.frame(argument = a, value = values)
  }))
})

writeLines(log, file.path(out, "manifest.txt"))
message("done: ", out)
