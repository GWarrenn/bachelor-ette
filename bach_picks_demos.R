library(tidyverse)
library(googlesheets)
library(curl)
library(reshape2)
library(ggbeeswarm)
library(scales)
library(viridis)
library(gridExtra)
library(grid)

###############################################################
##
## load data from google doc
##
###############################################################

## load scores & demos

pick_doc <- gs_title("Bachelorette Picks 2019 Data")
gs_ws_ls(got_doc)
bach_data <- gs_read(ss = pick_doc,ws = "Formulas")

## obtain most recent week of season

week <- gs_read(ss = pick_doc,ws = "weekly results")
most_recent_week <- max(week$week)

###############################################################
##
## clean/process data
##
###############################################################

## rename variables

bach_data <- bach_data %>%
  select(X1,X2,X35,X36,X37,X38,X39,X40,X41)

bach_data <- bach_data[-c(1,2),] 

columns <- c("Name","Score","Number of Seasons Watched","Total Time Spent on Picks (Minutes)","Charity of Choice","Age","Gender","Residence","Race")

colnames(bach_data) <- columns

## reshape data to long to aggregate means by demo group

bach_data_l <- melt(bach_data,id.vars = c("Name","Score"))

bach_data_l$value <- ifelse(bach_data_l$value == "9-Apr","4-9",
                            ifelse(bach_data_l$value == "3-Jan","1-3",
                                   ifelse(bach_data_l$value == "20-Oct","10-20",bach_data_l$value)))

## collapse low n-size demographics together

bach_data_l$recoded_value <- ifelse(bach_data_l$value == "41-60 minutes" | bach_data_l$value == "60+ minutes","40+ minutes",
                                    ifelse(bach_data_l$value %in% c("Black or African American","Hispanic or Latino","Asian or South Asian","Other"),"POC",
                                           ifelse(bach_data_l$value %in% c("Virginia","Maryland","Somewhere else"),"Everywhere else",bach_data_l$value)))


results$recoded_value <- gsub(x = results$recoded_value,pattern = " minutes",replacement = "")

###############################################################
##
## aggregate data
##
###############################################################

results <- bach_data_l %>%
  group_by(variable,recoded_value) %>%
  summarise(avg_score=mean(as.numeric(Score)),
            N=n())

results$recoded_value <- factor(results$recoded_value,levels = c("1-3","4-9","10-20","21+",
                                   "0-10 minutes","11-20 minutes","21-30 minutes","31-40 minutes","40+ minutes","American Humane Society","DC Education Fund","Don't care","Equality Federation", 
                                   "Special Olympics","18-24","25-29","30-34","Female", 
                                   "Male","Washington DC","Everywhere else",
                                   "White","POC","Prefer not to say"),
                        labels = c("1-3","4-9","10-20","21+",
                                   "0-10","11-20","21-30","31-40","40+",
                                   "American Humane Society","DC Education Fund","Don't care","Equality Federation", 
                                   "Special Olympics","18-24","25-29","30-34","Female", 
                                   "Male","Washington DC","Everywhere else",
                                   "White","POC","Prefer not to say"))


## filter out charity demo group, low n-sizes, and refusals

results <- results %>%
  filter(variable != "Charity of Choice" & N >= 5 & recoded_value != "Prefer not to say")

###############################################################
##
## create plot
##
###############################################################

# Create a function with OSSE theme defaults b/w with grey gridlines
theme_osse <- function (base_size = 11, base_family ="")  { #Create a function to create theme. Base font size 11, family is the default
  theme_bw() + theme(
    panel.border = element_rect(linetype = "solid", fill = NA),
    legend.position = "bottom", 
    panel.grid.minor = element_line(linetype = "dashed", size = 0.2)
  )
}

#Set the function for your session
theme_set(theme_osse())

pal <- c("#edf8fb","#b3cde3","#8c96c6","#88419d","#edf8fb","#b2e2e2","#66c2a4","#2ca25f","#006d2c","#e0f3db",
  "#a8ddb5","#43a2ca","#fee8c8","#e34a33","#ece7f2","#2b8cbe","#1c9099","#ece2f0")

demo_plot <- ggplot(results,aes(x=recoded_value,y=avg_score)) +
  facet_wrap(~variable,scales = "free") +
  scale_y_continuous(limits = c(0,.5)) +
  geom_text(aes(x=recoded_value,y=avg_score,label=round(avg_score,2)),vjust=-.35) +
  geom_bar(stat="identity",color="black",fill=pal) +
  labs(x="",y="Average Score",title="Bachelorette Pick Performance by Demographic Group",subtitle = paste("Performance as of Week",most_recent_week)) +
  theme(legend.position = "none")

ggsave(plot = demo_plot, "bachelor-ette\\results\\demo_plot.png", w = 10.67, h = 8,type = "cairo-png")


  